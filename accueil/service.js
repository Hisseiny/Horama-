// The service Horama of the public mode (#68): the only lines to change when its address is known.
// SERVICE: the address of the service (today the local one, for a trial).
// RAPPORT_URL: the page of the report (the dashboard, built apart). Empty: the follow-up is said in text under the field;
// filled: the visitor is sent to RAPPORT_URL?id=<id>&service=<SERVICE> as soon as the service accepts the address.
export const SERVICE = "http://127.0.0.1:8787";
export const RAPPORT_URL = "";
