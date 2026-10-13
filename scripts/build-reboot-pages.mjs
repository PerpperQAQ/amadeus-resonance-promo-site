// 从 src/reboot/page.template.html 生成三个变体页面：node scripts/build-reboot-pages.mjs
import fs from 'node:fs';
const tpl = fs.readFileSync('src/reboot/page.template.html', 'utf8');
const V = { white: '白色纸面版', dark: '暗色剧场版', hybrid: '白色 + 暗场混合版' };
for (const [v, t] of Object.entries(V)) {
  fs.writeFileSync(`reboot-${v}.html`, tpl.replaceAll('{{VARIANT}}', v).replaceAll('{{TITLE}}', `RE:BOOT 式概念稿（${t}）`));
  console.log(`reboot-${v}.html`);
}
