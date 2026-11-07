const target = process.argv[2];
if (!target) process.exit(2);
try {
  const response = await fetch('http://172.30.0.2:8080/check?url=' + encodeURIComponent(target), {signal: AbortSignal.timeout(12000), redirect: 'error'});
  const result = await response.json();
  console.log(JSON.stringify(result));
  process.exit(response.ok && result.ok === true ? 0 : 1);
} catch { console.error('gateway_unavailable'); process.exit(1); }
