import { Body, Container, Head, Heading, Hr, Html, Preview, Row, Column, Text } from '@react-email/components'
import { formatAmount } from '@gok-net/shared'

export interface WeeklySummaryEmailProps {
  siteName: string
  weekLabel: string
  totalSpent: number
  totalPaid: number
  totalOutstanding: number
  entryCount: number
  topCategories: Array<{ name: string; amount: number }>
}

/**
 * The one email GOK-NET sends on a schedule (see app/api/cron/weekly-summary).
 * Kept deliberately plain — no images, no multi-column layout — since this
 * only needs to render legibly in whatever mail client an owner/admin opens
 * it in, not to look like a marketing email.
 */
export function WeeklySummaryEmail({
  siteName,
  weekLabel,
  totalSpent,
  totalPaid,
  totalOutstanding,
  entryCount,
  topCategories,
}: WeeklySummaryEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${siteName}: ${formatAmount(totalSpent)} spent this week`}</Preview>
      <Body style={{ backgroundColor: '#f4f3ef', fontFamily: 'Helvetica, Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 32, margin: '24px auto', maxWidth: 480 }}>
          <Text style={{ color: '#b86724', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Weekly summary
          </Text>
          <Heading style={{ margin: '0 0 4px', fontSize: 22, color: '#282824' }}>{siteName}</Heading>
          <Text style={{ margin: '0 0 24px', color: '#77756e', fontSize: 13 }}>{weekLabel}</Text>

          <Row>
            <Column>
              <Text style={{ margin: 0, color: '#7e7c75', fontSize: 11 }}>Spent</Text>
              <Text style={{ margin: '2px 0 0', color: '#282824', fontSize: 18, fontWeight: 700 }}>{formatAmount(totalSpent)}</Text>
            </Column>
            <Column>
              <Text style={{ margin: 0, color: '#7e7c75', fontSize: 11 }}>Paid</Text>
              <Text style={{ margin: '2px 0 0', color: '#282824', fontSize: 18, fontWeight: 700 }}>{formatAmount(totalPaid)}</Text>
            </Column>
            <Column>
              <Text style={{ margin: 0, color: '#7e7c75', fontSize: 11 }}>Outstanding</Text>
              <Text style={{ margin: '2px 0 0', color: '#282824', fontSize: 18, fontWeight: 700 }}>{formatAmount(totalOutstanding)}</Text>
            </Column>
          </Row>

          <Text style={{ margin: '20px 0 0', color: '#918e87', fontSize: 11 }}>
            {entryCount} expense{entryCount === 1 ? '' : 's'} recorded this week
          </Text>

          {topCategories.length > 0 && (
            <>
              <Hr style={{ borderColor: '#eeede8', margin: '20px 0' }} />
              <Text style={{ margin: '0 0 10px', color: '#34342f', fontSize: 12, fontWeight: 700 }}>By category</Text>
              {topCategories.map((category) => (
                <Row key={category.name} style={{ marginBottom: 6 }}>
                  <Column>
                    <Text style={{ margin: 0, color: '#4b4a45', fontSize: 12 }}>{category.name}</Text>
                  </Column>
                  <Column align="right">
                    <Text style={{ margin: 0, color: '#4b4a45', fontSize: 12 }}>{formatAmount(category.amount)}</Text>
                  </Column>
                </Row>
              ))}
            </>
          )}

          <Hr style={{ borderColor: '#eeede8', margin: '24px 0 16px' }} />
          <Text style={{ margin: 0, color: '#a19e95', fontSize: 10 }}>
            You are receiving this because you are an owner or admin on {siteName} in GOK-NET.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
