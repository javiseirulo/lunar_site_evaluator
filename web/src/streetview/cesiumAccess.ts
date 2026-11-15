/** Public browser application token, intentionally shared by Pablo. Only assets:read,
 * Moon2684829, localhost/127.0.0.1:5173 (owner-confirmed). No private scopes.
 * Override per deployment through VITE_CESIUM_ION_TOKEN. Never include in URLs/QR.
 */
const TEAM_CESIUM_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6Ii1oWktfUVpXelBxWXlKb3IiLCJqdGkiOiI1NjU4YzJmYy05YzMwLTQxNDAtODUzMC0wZmVhNDNkMDliMDYiLCJpZCI6NTQ5MjkxLCJzdWIiOiJwYWJsb2l6Z3VpIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6Imx1bmFyLXN0cmVldHZpZXctZGV2IiwiaWF0IjoxNzk0NzQyNDM3fQ.OFVJgmn0o7tweHRnluZIqBNRQTUtT1dj9bEWL9_bQWk';
export const CESIUM_APPLICATION_TOKEN =
  import.meta.env.VITE_CESIUM_ION_TOKEN?.trim() || TEAM_CESIUM_TOKEN;
