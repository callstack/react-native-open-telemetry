import Foundation

/// Eager check (D8/D9), no exporter built. `URL(string: "not a url")` succeeds on current Foundation, so the scheme
/// and host are checked explicitly. Returns an error message or nil.
func validateExportUrl(_ url: String) -> String? {
  guard let u = URL(string: url), let scheme = u.scheme?.lowercased(), ["http", "https"].contains(scheme),
        !(u.host ?? "").isEmpty else {
    return "invalid exportUrl \"\(url)\": expected http(s)://host[:port]"
  }
  return nil
}
