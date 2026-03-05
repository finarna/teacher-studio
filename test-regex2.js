const txt = "At $x = 1$, the function $f(x) = \\begin{cases} x^3 - 1 & 1 < x < \\infty \\\\ x - 1 & -\\infty < x \\leq 1 \\end{cases}$ is";
const parts = txt.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
console.log(parts);
