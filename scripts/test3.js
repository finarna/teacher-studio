const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
const str2 = `At $x = 1$, the function $f(x) = \\begin{cases} x^3 - 1 & 1 < x < \\infty \\\\ x - 1 & -\\infty < x \\leq 1 \\end{cases}$ is`;
console.log(str2.split(regex));
