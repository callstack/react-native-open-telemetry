import OpenTelemetryApi

// Number.isInteger(v): whole and finite (-0 included). Int64.max as Double is 2^63, hence the exclusive bound.
private func isLong(_ v: Double) -> Bool { v == v.rounded() && v >= -9.223372036854775807E18 && v < 9.223372036854775807E18 }

/// JS numbers become `int` iff Number.isInteger (and they fit), else `double`; the same rule on JS, Kotlin, Swift.
func attributes(of list: [CoreAttribute]) -> [String: AttributeValue] {
  var out = [String: AttributeValue](minimumCapacity: list.count)
  for a in list {
    switch a.value {
    case let .string(v): out[a.key] = .string(v)
    case let .bool(v): out[a.key] = .bool(v)
    case let .number(v): out[a.key] = isLong(v) ? .int(Int(v)) : .double(v)
    case let .strings(v): out[a.key] = .stringArray(v)
    case let .bools(v): out[a.key] = .boolArray(v)
    case let .numbers(v): out[a.key] = v.allSatisfy(isLong) ? .intArray(v.map { Int($0) }) : .doubleArray(v)
    }
  }
  return out
}
