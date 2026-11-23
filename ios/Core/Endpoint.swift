import Foundation

/// Base URL -> traces endpoint: `/v1/traces` is appended unless already present (same rule as JS and Android).
func tracesUrl(_ exportUrl: String) -> String {
  var base = Substring(exportUrl)
  while base.hasSuffix("/") { base = base.dropLast() }
  return base.hasSuffix("/v1/traces") ? String(base) : base + "/v1/traces"
}

/// Eager check (D8/D9), no exporter built. `URL(string: "not a url")` succeeds on current Foundation, so the scheme
/// and host are checked explicitly. Returns an error message or nil.
func validateExportUrl(_ url: String) -> String? {
  guard let u = URL(string: url), let scheme = u.scheme?.lowercased(), ["http", "https"].contains(scheme),
        !(u.host ?? "").isEmpty else {
    return "invalid exportUrl \"\(url)\": expected http(s)://host[:port]"
  }
  return nil
}
