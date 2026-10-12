/**
 * “IBM 5100 风格乱码”：APL 符号 + 十六进制字符。
 * 剧情梗：只有 IBM 5100 能破解的老式计算机语言。仅作装饰，不含任何真实加密功能。
 */
export const APL_CHARS = '⍺⍵⌈⌊⍴⍳⍋⍒⌽⊖⍉⌹⍟⍎⍕⊥⊤∊⍷⍬⍱⍲≠≤≥⌷⍪⍨⍣⍤⍥⍢⌸⌿⍀⍝⍞∘○∇∆⍙⍫⍌⍍⍏⍐⍑⍓⍔⍖⍗⍘⍚⍛⍜⍠';
const HEX = '0123456789ABCDEF';
export function cipherChar() {
  const r = Math.random();
  if (r < 0.5) return HEX[(Math.random() * 16) | 0];
  return APL_CHARS[(Math.random() * APL_CHARS.length) | 0];
}

function textNodes(root) {
  const out = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) if (n.data.trim()) out.push(n);
  return out;
}

/**
 * 对一个元素内的所有文本节点做“乱码 ↔ 原文”动画。
 * frame(p)：p∈[0,1]，前 p 比例的字符显示为真实文字，其余为乱码；p=-1 全乱码；p=1 还原。
 */
export class TextCipher {
  constructor(el) {
    this.el = el;
    this.nodes = textNodes(el).map((node) => ({ node, src: node.data }));
    this.total = this.nodes.reduce((a, b) => a + b.src.length, 0);
  }
  frame(p) {
    const upto = p < 0 ? -1 : Math.floor(this.total * p);
    let idx = 0;
    for (const { node, src } of this.nodes) {
      let s = '';
      for (let i = 0; i < src.length; i++, idx++) {
        const c = src[i];
        s += /\s|[，。、；：！？“”‘’（）《》·—…／\/\-\.:,]/.test(c) ? c : (idx < upto ? c : cipherChar());
      }
      node.data = s;
    }
  }
  restore() { for (const { node, src } of this.nodes) node.data = src; }
}
