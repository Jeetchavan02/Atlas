const text = "\n<think>\nHere is a thinking process:\n...\n</think>\n\nGo rest and get the sleep you need.";
const out = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "");
console.log("OUT:", out);
const text2 = "<think>I should say hello.</think> Hello.";
const out2 = text2.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "");
console.log("OUT2:", out2);
