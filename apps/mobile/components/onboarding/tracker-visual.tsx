import { StyleSheet, Text, View } from 'react-native'

const ROWS = [
  { name: 'Narmada Cement Co.', meta: 'Material • Today', amount: '₹1,24,000', dot: '#E2F5E9' },
  { name: 'Prime Steel Traders', meta: 'Reinforcements • Oct 24', amount: '₹3,58,500', dot: '#FEE4E2' },
]

export function TrackerVisual() {
  return (
    <View style={styles.card}>
      <View style={styles.totalBlock}>
        <Text style={styles.label}>TOTAL OUTSTANDING</Text>
        <Text style={styles.total}>₹4,82,500</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.rows}>
        {ROWS.map((row) => (
          <View key={row.name} style={styles.row}>
            <View>
              <Text style={styles.name}>{row.name}</Text>
              <Text style={styles.meta}>{row.meta}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.amount}>{row.amount}</Text>
              <View style={[styles.statusDot, { backgroundColor: row.dot }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0DDD5',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 20,
    gap: 16,
    boxShadow: '0 12px 12px rgba(0,0,0,0.04)',
  },
  totalBlock: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: '#8A8A8A' },
  total: { fontSize: 28, fontWeight: '800', color: '#252522' },
  divider: { height: 1, backgroundColor: '#EBE7DE' },
  rows: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '700', color: '#252522' },
  meta: { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontSize: 14, fontWeight: '700', color: '#252522' },
  statusDot: { width: 24, height: 24, borderRadius: 12 },
})
