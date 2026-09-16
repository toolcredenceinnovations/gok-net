import { StyleSheet, Text, View } from 'react-native'

const TAGS = ['Enterprise', 'High Priority']

export function LeadsVisual() {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.leadId}>Lead #4829</Text>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>New</Text>
        </View>
      </View>

      <Text style={styles.name}>Alex Johnson</Text>

      <View style={styles.contactBlock}>
        <Text style={styles.contactLine}>+1 (555) 123-4567</Text>
        <Text style={styles.contactLine}>alex.johnson@example.com</Text>
        <Text style={styles.lastContact}>Last Contact: Oct 24, 2023</Text>
      </View>

      <View style={styles.tagRow}>
        {TAGS.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <View style={[styles.actionButton, styles.callButton]}>
          <Text style={styles.callButtonText}>Call</Text>
        </View>
        <View style={[styles.actionButton, styles.emailButton]}>
          <Text style={styles.emailButtonText}>Email</Text>
        </View>
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
    gap: 12,
    boxShadow: '0 12px 12px rgba(0,0,0,0.04)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leadId: { fontSize: 16, fontWeight: '700', color: '#252522' },
  newBadge: { backgroundColor: '#E6EFFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: '#3D66D6' },
  name: { fontSize: 20, fontWeight: '800', color: '#252522' },
  contactBlock: { gap: 3 },
  contactLine: { fontSize: 14, color: '#45433E' },
  lastContact: { fontSize: 12, color: '#8A8A8A', marginTop: 3 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: '#F1EFE9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#45433E' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1, height: 44, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  callButton: { backgroundColor: '#252522' },
  callButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emailButton: { backgroundColor: '#F1EFE9' },
  emailButtonText: { color: '#252522', fontSize: 14, fontWeight: '700' },
})
