import { lookup as dnsLookup } from "node:dns";
import { mkdirSync, writeFileSync } from "node:fs";
import type { LookupAddress } from "node:dns";
import { createServer, request as httpRequest } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, connect, isIP } from "node:net";
import { join } from "node:path";
import { Readable, pipeline } from "node:stream";
import type { Duplex } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

// Visited sites come from anyone: no request may reach loopback, private, link-local, metadata or internal addresses.
const privateRanges = new BlockList();
for (const [network, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) privateRanges.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [["::", 128], ["::1", 128], ["64:ff9b::", 96], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) privateRanges.addSubnet(network, prefix, "ipv6");

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  return family === 0 || privateRanges.check(address, family === 4 ? "ipv4" : "ipv6");
}

export class PrivateAddressError extends Error {}

export type Lookup = (hostname: string, options: { all: true }, callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void) => void;

// One resolution, every address checked, and the connection goes to the checked address: a second resolution cannot rebind.
export async function resolvePublic(host: string, { lookup = dnsLookup as Lookup, blocked = isPrivateAddress } = {}): Promise<LookupAddress> {
  const name = host.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  const refuse = (detail: string) => new PrivateAddressError(`Adresse privée refusée : ${host}${detail}.`);
  if (isIP(name)) {
    if (blocked(name)) throw refuse("");
    return { address: name, family: isIP(name) };
  }
  if (/(?:^|\.)(?:localhost|internal|local)$/.test(name)) throw refuse("");
  const addresses = await new Promise<LookupAddress[]>((resolve, reject) => lookup(name, { all: true }, (error, found) => error ? reject(error) : resolve(found)));
  if (!addresses.length) throw new Error(`Nom introuvable : ${host}.`);
  const refused = addresses.find(item => blocked(item.address));
  if (refused) throw refuse(` (résolu en ${refused.address})`);
  return addresses[0];
}

type PublicOptions = Parameters<typeof resolvePublic>[1];

// fetch for site content (robots, sitemaps, pages, links) that refuses private addresses, after DNS resolution and at each redirect.
export function createPublicFetch(options: PublicOptions = {}): typeof fetch {
  return async (input, init = {}) => {
    let address = new URL(input instanceof Request ? input.url : String(input));
    const method = (init.method ?? "GET").toUpperCase();
    if (!["GET", "HEAD"].includes(method) || init.body) throw new TypeError("Seules les requêtes GET et HEAD sans corps sont prises en charge.");
    for (let hop = 0; hop <= 20; hop++) {
      if (!/^https?:$/.test(address.protocol)) throw new TypeError(`Protocole refusé : ${address.protocol}`);
      const target = await resolvePublic(address.hostname, options);
      init.signal?.throwIfAborted();
      const response = await new Promise<IncomingMessage>((resolve, reject) => {
        const headers = Object.fromEntries(new Headers(init.headers));
        const outgoing = (address.protocol === "https:" ? httpsRequest : httpRequest)(address, {
          method, headers: { "accept-encoding": "gzip, deflate, br", ...headers }, signal: init.signal ?? undefined,
          lookup: (_hostname, lookupOptions, callback) => lookupOptions.all ? callback(null, [target]) : callback(null, target.address, target.family),
        }, resolve);
        outgoing.on("error", reject);
        outgoing.end();
      });
      const status = response.statusCode ?? 0;
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) responseHeaders.append(name, item);
      }
      const location = responseHeaders.get("location");
      if (init.redirect !== "manual" && status >= 300 && status < 400 && location) {
        if (init.redirect === "error") { response.destroy(); throw new TypeError("Redirection refusée."); }
        response.resume();
        address = new URL(location, address);
        continue;
      }
      const encoding = responseHeaders.get("content-encoding")?.toLowerCase();
      const decoder = encoding === "gzip" ? createGunzip() : encoding === "br" ? createBrotliDecompress() : encoding === "deflate" ? createInflate() : undefined;
      if (decoder) { responseHeaders.delete("content-encoding"); responseHeaders.delete("content-length"); }
      const empty = method === "HEAD" || [101, 204, 205, 304].includes(status);
      if (empty) response.resume();
      const body = empty ? null : Readable.toWeb(decoder ? pipeline(response, decoder, () => {}) : response) as ReadableStream;
      if (status < 200 || status > 599) { response.destroy(); throw new TypeError(`Statut HTTP inattendu : ${status}`); }
      const result = new Response(body, { status, statusText: response.statusMessage, headers: responseHeaders });
      Object.defineProperty(result, "url", { value: address.href });
      return result;
    }
    throw new TypeError("Trop de redirections.");
  };
}

export const fetchPublic = createPublicFetch();

// HTTP proxy for Chrome (publicProxyChromeFlags; <-loopback> removes the implicit localhost bypass): documents, sub-resources, fetch/XHR and WebSocket
// (tunnelled with CONNECT) leave Chrome only through it; Chrome then never resolves names itself.
export async function startPublicProxy(options: PublicOptions & { log?: (message: string) => void } = {}): Promise<{ port: number; close(): Promise<void> }> {
  const { log = () => {}, ...publicOptions } = options;
  const sockets = new Set<Duplex>();
  const refuse = (target: string, error: unknown) => { log(`Proxy : ${target} refusé (${error instanceof Error ? error.message : String(error)}).`); };
  const server: Server = createServer(async (incoming, outgoing) => {
    let address: URL;
    try { address = new URL(incoming.url ?? ""); if (address.protocol !== "http:") throw new Error("absolute-form http attendu"); }
    catch (error) { refuse(String(incoming.url), error); outgoing.writeHead(400).end(); return; }
    try {
      const target = await resolvePublic(address.hostname, publicOptions);
      const headers = { ...incoming.headers };
      for (const name of ["proxy-connection", "proxy-authorization", "connection", "keep-alive"]) delete headers[name];
      const upstream = httpRequest({ host: target.address, family: target.family, port: address.port || 80, path: address.pathname + address.search, method: incoming.method, headers }, response => {
        outgoing.writeHead(response.statusCode ?? 502, response.statusMessage, Object.fromEntries(Object.entries(response.headers).filter(([name]) => !["connection", "keep-alive"].includes(name))));
        response.pipe(outgoing);
      });
      upstream.on("socket", socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
      upstream.on("error", () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
      outgoing.on("close", () => upstream.destroy());
      incoming.pipe(upstream);
    } catch (error) {
      refuse(address.host, error);
      const privateTarget = error instanceof PrivateAddressError;
      outgoing.writeHead(privateTarget ? 403 : 502, { "content-type": "text/plain; charset=utf-8" }).end(privateTarget ? "Adresse refusée par Horama." : "Adresse injoignable.");
    }
  });
  server.on("upgrade", (incoming, socket) => { refuse(String(incoming.url), new Error("WebSocket hors CONNECT")); socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"); });
  server.on("connect", async (incoming, client, head) => {
    sockets.add(client); client.on("close", () => sockets.delete(client)); client.on("error", () => {});
    const authority = incoming.url ?? "";
    try {
      const { hostname, port } = tunnelTarget(authority);
      const target = await resolvePublic(hostname, publicOptions);
      const upstream = connect({ host: target.address, family: target.family, port }, () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        upstream.pipe(client); client.pipe(upstream);
      });
      sockets.add(upstream); upstream.on("close", () => sockets.delete(upstream));
      upstream.on("error", () => client.destroy());
      client.on("close", () => upstream.destroy());
    } catch (error) { refuse(authority, error); client.end(error instanceof PrivateAddressError ? "HTTP/1.1 403 Forbidden\r\n\r\n" : "HTTP/1.1 502 Bad Gateway\r\n\r\n"); }
  });
  server.on("connection", socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => resolve()); });
  const port = (server.address() as { port: number }).port;
  return { port, close: () => new Promise<void>(resolve => { for (const socket of sockets) socket.destroy(); server.close(() => resolve()); }) };
}

export function tunnelTarget(authority: string): { hostname: string; port: number } {
  const { hostname, port } = new URL(`https://${authority}`);
  return { hostname, port: Number(port || 443) };
}

export const publicProxyChromeFlags = (port: number) => [`--proxy-server=http://127.0.0.1:${port}`, "--proxy-bypass-list=<-loopback>"];

// WebRTC sends UDP outside the proxy (STUN to 127.0.0.1 measured with Chrome 156); the --force-webrtc-ip-handling-policy flag
// does not stop it, this profile preference does.
export function writePublicChromePreferences(profile: string): void {
  mkdirSync(join(profile, "Default"), { recursive: true });
  writeFileSync(join(profile, "Default", "Preferences"), JSON.stringify({ webrtc: { ip_handling_policy: "disable_non_proxied_udp" } }));
}
