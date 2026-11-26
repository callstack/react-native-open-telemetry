import Foundation

func validateExportUrl(_ url: String) -> String? {
  guard let u = URL(string: url), let scheme = u.scheme?.lowercased(), ["http", "https"].contains(scheme),
        !(u.host ?? "").isEmpty else {
    return "invalid exportUrl \"\(url)\": expected http(s)://host[:port]"
  }
  return nil
}
