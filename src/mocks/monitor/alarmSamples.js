/** Sample alarms matching diagnosis.alarms shape from backend */

export const criticalAlarm = {
  severity: 'Critical',
  title: 'Low Suction Pressure',
  message: 'Suction pressure below safe operating threshold.',
  possible_causes: ['Expansion valve fault', 'Low refrigerant charge'],
  recommendation: ['Inspect suction line', 'Check refrigerant level'],
}

export const warningAlarm = {
  severity: 'Warning',
  title: 'High Superheat',
  message: 'Superheat exceeds recommended range.',
  possible_causes: ['Low refrigerant flow', 'Expansion valve misadjusted'],
  recommendation: ['Verify expansion valve', 'Check superheat setpoint'],
}

export const warningSuperheat = {
  severity: 'Warning',
  title: 'High Superheat',
  message: 'Superheat at suction line is elevated.',
  possible_causes: ['Insufficient refrigerant feed'],
  recommendation: ['Adjust expansion valve'],
}
