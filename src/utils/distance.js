export async function calculateDistance(origin, destination) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'No API key configured' };
  }

  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
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

export async function calculateAllDistances(homeBase, jobAddress, landfillAddress) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'No API key configured' };
  }

  if (!homeBase || !jobAddress || !landfillAddress) {
    return { success: false, error: 'All three addresses are required for auto-calculation' };
  }

  const [homeToJob, jobToLandfill, landfillToHome] = await Promise.all([
    calculateDistance(homeBase, jobAddress),
    calculateDistance(jobAddress, landfillAddress),
    calculateDistance(landfillAddress, homeBase),
  ]);

  const errors = [];
  if (!homeToJob.success) errors.push(`Home to Job: ${homeToJob.error}`);
  if (!jobToLandfill.success) errors.push(`Job to Landfill: ${jobToLandfill.error}`);
  if (!landfillToHome.success) errors.push(`Landfill to Home: ${landfillToHome.error}`);

  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }

  return {
    success: true,
    homeBaseToJob: homeToJob.miles,
    jobToLandfill: jobToLandfill.miles,
    landfillToHomeBase: landfillToHome.miles,
  };
}
