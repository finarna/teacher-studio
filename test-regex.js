const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
const str2 = "At $x = 1$, the function $f(x) = \\begin{cases} x^3 - 1 & 1 < x < \\infty \\\\ x - 1 & -\\infty < x \\leq 1 \\end{cases}$ is";
const parts = str2.split(regex);
console.log(parts);
