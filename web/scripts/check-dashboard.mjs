const [technique, address] = process.argv.slice(2);

if (!['xafs', 'xrd'].includes(technique) || !address) {
  throw new Error('用法：node scripts/check-dashboard.mjs <xafs|xrd> <地址>');
}

let response;
try {
  response = await fetch(address);
} catch (error) {
  throw new Error(`无法访问 ${address}。请先启动对应端口。`, { cause: error });
}

const html = await response.text();
if (!response.ok || !html.includes(`data-instrument=\"${technique}\"`)) {
  throw new Error(`${address} 未返回 ${technique.toUpperCase()} 只读看板。`);
}

console.log(`${technique.toUpperCase()} 只读看板可访问：${address}`);
