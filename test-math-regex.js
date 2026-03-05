const txt = "At $x=1$, the function $f(x)= \\begin{cases} x-1 & 1<x<\\infty \\\\ x & x<1 \\end{cases}$ is given.";

const regex1 = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
const regex2 = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;

console.log("Regex 1:", txt.split(regex1));
console.log("Regex 2:", txt.split(regex2));
