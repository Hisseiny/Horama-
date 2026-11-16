export const CSS = `
:root { color-scheme: only light; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: #ffffff;
  color: #1d2733;
  font: 14px/20px Arial, "Liberation Sans", Helvetica, sans-serif;
  white-space: nowrap;
}
a { color: #1f4fb5; text-decoration: none; }

.sidebar { position: absolute; left: 0; top: 0; width: 220px; height: 900px; background: #f3f5f8; border-right: 1px solid #d5dbe3; }
.brand { height: 56px; padding: 18px 20px; border-bottom: 1px solid #d5dbe3; font-size: 16px; font-weight: 700; overflow: hidden; }
.brand svg { float: left; margin: 2px 10px 0 0; }
.sidebar a { display: block; width: 219px; height: 40px; padding: 10px 20px; color: #1d2733; overflow: hidden; }
.sidebar a.on { background: #e1e9f8; color: #1f4fb5; font-weight: 700; }

.topbar { position: absolute; left: 220px; top: 0; width: 1060px; height: 56px; border-bottom: 1px solid #d5dbe3; }
.topbar span, .topbar a { position: absolute; top: 18px; height: 20px; overflow: hidden; }
.topbar .account { left: 32px; width: 300px; font-weight: 700; }
.topbar .today { left: 660px; width: 220px; text-align: right; color: #5b6878; }
.topbar .logout { left: 912px; width: 116px; text-align: right; }

.content { position: absolute; left: 220px; top: 56px; width: 1060px; height: 844px; padding: 28px 32px 0; }
h1 { width: 600px; height: 32px; margin: 0 0 20px; font-size: 22px; line-height: 32px; overflow: hidden; }
h2 { width: 600px; height: 24px; margin: 32px 0 12px; font-size: 16px; line-height: 24px; overflow: hidden; }

.cards { display: flex; gap: 24px; height: 104px; }
.card { flex: none; width: 316px; height: 104px; padding: 16px 20px; border: 1px solid #d5dbe3; }
.card-label { height: 20px; color: #5b6878; overflow: hidden; }
.card-value { height: 36px; margin-top: 8px; font-size: 26px; font-weight: 700; line-height: 36px; overflow: hidden; }

table { width: 996px; table-layout: fixed; border-collapse: separate; border-spacing: 0; }
th, td { border-bottom: 1px solid #d5dbe3; text-align: left; vertical-align: top; overflow: hidden; }
th { height: 40px; padding: 9px 16px 0; border-top: 1px solid #d5dbe3; background: #f3f5f8; color: #5b6878; font-size: 13px; font-weight: 700; }
td { height: 45px; padding: 12px 16px 0; }
td a { display: block; width: 128px; height: 20px; overflow: hidden; }
.amount { text-align: right; }
.total td { background: #f3f5f8; font-weight: 700; }
.client { display: block; width: 364px; height: 20px; overflow: hidden; }
.client.cut { width: 60px; text-overflow: ellipsis; }

.toolbar { position: relative; width: 996px; height: 36px; margin-bottom: 16px; }
.filter { position: absolute; left: 0; top: 0; width: 240px; }
.filter summary { display: block; position: relative; height: 36px; padding: 7px 12px; border: 1px solid #b8c1cc; background: #ffffff; overflow: hidden; }
.filter summary::-webkit-details-marker { display: none; }
.filter summary svg { position: absolute; right: 12px; top: 14px; }
.filter-menu { position: absolute; left: 0; top: 35px; z-index: 2; width: 240px; border: 1px solid #b8c1cc; background: #ffffff; }
.filter-menu a { display: block; height: 36px; padding: 8px 12px; color: #1d2733; overflow: hidden; }
.filter-menu a.on { color: #1f4fb5; font-weight: 700; }

button { display: block; height: 36px; margin: 0; padding: 0; border: 1px solid #b8c1cc; border-radius: 0; background: #ffffff; color: #1d2733; font: inherit; line-height: 34px; text-align: center; overflow: hidden; appearance: none; }
button.primary { border-color: #1f4fb5; background: #1f4fb5; color: #ffffff; font-weight: 700; }
.export { position: absolute; right: 0; top: 0; width: 120px; }
.new { position: absolute; right: 132px; top: 0; width: 160px; }

.table-footer { position: relative; width: 996px; height: 36px; margin-top: 12px; background: #ffffff; }
.table-footer.up { margin-top: -24px; }
.count { position: absolute; left: 0; top: 8px; width: 300px; height: 20px; color: #5b6878; overflow: hidden; }

.meta { position: relative; width: 996px; height: 28px; margin-bottom: 20px; }
.meta span { position: absolute; top: 4px; height: 20px; overflow: hidden; }
.meta .meta-client { left: 0; width: 320px; }
.meta .meta-due { left: 340px; width: 240px; }
.meta .badge { left: 600px; top: 0; width: 200px; height: 28px; border: 1px solid #1f4fb5; color: #1f4fb5; font-size: 13px; font-weight: 700; line-height: 26px; text-align: center; }
.meta .badge.full { background: #1f4fb5; color: #ffffff; }
.back { display: block; width: 200px; height: 20px; margin-top: 20px; overflow: hidden; }

.login { position: absolute; left: 440px; top: 180px; width: 400px; padding: 32px; border: 1px solid #d5dbe3; }
.login label { display: block; width: 334px; height: 20px; margin-top: 16px; color: #5b6878; overflow: hidden; }
.login input { display: block; width: 334px; height: 36px; margin: 6px 0 0; padding: 0 10px; border: 1px solid #b8c1cc; border-radius: 0; background: #ffffff; color: #1d2733; font: inherit; appearance: none; }
.login button { width: 334px; margin-top: 24px; }
.login p { width: 334px; height: 20px; margin: 16px 0 0; font-weight: 700; overflow: hidden; }
`;
