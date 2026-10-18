# Telangana blood bank directory (static)

`telangana-blood-banks.json` is the Telangana subset of the Government of India
"Blood Bank Directory" published on the Open Government Data Platform (data.gov.in),
National Health Portal / Ministry of Health and Family Welfare, released under
GODL-India (Government Open Data License - India).

- Source dataset: https://www.data.gov.in/catalog/blood-bank-directory-national-health-portal
- Copy used here: a snapshot of the CSV as mirrored in https://github.com/Nitesh3007/Blood-Bank-Directory
  (the official data.gov.in download was unreachable from our environment on 18 Oct 2026).
  The snapshot date is not stated; treat details as possibly outdated.
- Kept: bank name, category, district, city, address, pincode, one institutional contact number,
  component availability flag, service time, coordinates (only when inside Telangana).
- Dropped on purpose: nodal officer names, personal emails and mobile numbers.
- This is a directory, NOT live stock. Live stock lives on e-RaktKosh (https://eraktkosh.mohfw.gov.in).
