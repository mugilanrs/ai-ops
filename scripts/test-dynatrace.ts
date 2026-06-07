import { config } from 'dotenv';
config({ path: '.env.local' });

const envUrl = process.env.DYNATRACE_ENV_URL;
const token  = process.env.DYNATRACE_API_TOKEN;

async function main() {
  console.log('DYNATRACE_ENV_URL:', envUrl ? `${envUrl.slice(0, 30)}...` : '(not set)');
  console.log('DYNATRACE_API_TOKEN:', token ? `${token.slice(0, 10)}...` : '(not set)');

  if (!envUrl || !token) {
    console.error('\n❌ Env vars missing — check .env.local');
    process.exit(1);
  }

  const payload = {
    eventType: 'CUSTOM_INFO',
    title: 'AIOps test event — connectivity check',
    properties: {
      'incident.id':       'TEST-001',
      'incident.severity': 'P3',
      'incident.category': 'test',
      'incident.service':  'aiops-platform',
    },
  };

  console.log('\nPosting to:', `${envUrl}/api/v2/events/ingest`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${envUrl}/api/v2/events/ingest`, {
    method: 'POST',
    headers: {
      Authorization:  `Api-Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  console.log('\nHTTP status:', res.status);
  console.log('Response body:', body);

  if (res.ok) {
    console.log('\n✅ Event pushed — check Dynatrace UI → Events');
  } else {
    console.log('\n❌ Push failed');
  }
}

main().catch(console.error);
