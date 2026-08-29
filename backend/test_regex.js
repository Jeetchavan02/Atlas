const text = "Goodnight, Sir. Sleep well.";
const out = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").replace(/^[\s\n]+/, "").trim();
console.log("OUT:", out);
const text2 = "<think>I should sleep</think>Goodnight";
const out2 = text2.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").replace(/^[\s\n]+/, "").trim();
console.log("OUT2:", out2);
const text3 = "<think>I should sleep...";
const out3 = text3.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").replace(/^[\s\n]+/, "").trim();
console.log("OUT3:", out3);
