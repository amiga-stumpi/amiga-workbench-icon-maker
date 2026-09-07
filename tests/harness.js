export const cases = [];
export function test(name, run) {
  cases.push({ name, run });
}
export function assert(value, message = "Assertion fehlgeschlagen") {
  if (!value) throw new Error(message);
}
export function equal(actual, expected) {
  if (actual !== expected)
    throw new Error(`Erwartet ${expected}, erhalten ${actual}`);
}
export function bytesEqual(actual, expected) {
  equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++)
    if (actual[i] !== expected[i])
      throw new Error(`Byte/Pixel ${i}: ${actual[i]} statt ${expected[i]}`);
}
export function throws(run, match) {
  let error;
  try {
    run();
  } catch (e) {
    error = e;
  }
  assert(error, "Fehler erwartet");
  if (match) assert(match.test(error.message), error.message);
}
export async function runAll() {
  const results = [];
  for (const item of cases) {
    try {
      await item.run();
      results.push({ name: item.name, ok: true });
    } catch (e) {
      results.push({ name: item.name, ok: false, error: e.message });
    }
  }
  return results;
}
