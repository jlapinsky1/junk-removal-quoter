export async function calculateDistance(jobAddress, landfillAddress) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'No API key configured' };
  }

  try {
    const params = new URLSearchParams({
      origins: jobAddress,
      destinations: landfillAddress,
      units: 'imperial',
      key: apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );

    if (!response.ok) {
      return { success: false, error: 'API request failed' };
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      return { success: false, error: `API error: ${data.status}` };
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      return { success: false, error: 'Could not calculate distance for this address' };
    }

    // Distance is in meters, convert to miles
    const miles = Math.round(element.distance.value / 1609.34 * 10) / 10;
    const duration = element.duration.text;

    return { success: true, miles, duration };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
