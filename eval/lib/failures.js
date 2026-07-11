export function classifyFailure(error) {
  const message = String(error?.message ?? error);

  if (/not configured|No runner implemented|No dataset selector|not available/i.test(message)) {
    return "unsupported";
  }

  if (/Timeout|timed out|timeout/i.test(message)) {
    return "timeout";
  }

  if (/parse|Newick|invalid/i.test(message)) {
    return "parse_error";
  }

  if (/crash|Target page|browser has been closed|SIG/i.test(message)) {
    return "browser_crash";
  }

  if (/validation|blank|No svg|No canvas|render/i.test(message)) {
    return "render_invalid";
  }

  return "runtime_error";
}
