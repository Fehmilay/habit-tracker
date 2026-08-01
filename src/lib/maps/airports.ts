export interface Airport {
  iata: string
  city: string
  country: string
  coordinates: [number, number]
}

export const AIRPORTS: Airport[] = [
  { iata: 'DUS', city: 'Düsseldorf', country: 'Deutschland', coordinates: [6.7668, 51.2895] },
  { iata: 'BER', city: 'Berlin', country: 'Deutschland', coordinates: [13.5033, 52.3667] },
  { iata: 'MUC', city: 'München', country: 'Deutschland', coordinates: [11.7861, 48.3538] },
  { iata: 'LHR', city: 'London', country: 'UK', coordinates: [-0.4543, 51.47] },
  { iata: 'CDG', city: 'Paris', country: 'Frankreich', coordinates: [2.55, 49.0097] },
  { iata: 'JFK', city: 'New York', country: 'USA', coordinates: [-73.7781, 40.6413] },
  { iata: 'LAX', city: 'Los Angeles', country: 'USA', coordinates: [-118.4085, 33.9416] },
  { iata: 'SFO', city: 'San Francisco', country: 'USA', coordinates: [-122.379, 37.6213] },
  { iata: 'MIA', city: 'Miami', country: 'USA', coordinates: [-80.287, 25.7959] },
  { iata: 'DXB', city: 'Dubai', country: 'VAE', coordinates: [55.3644, 25.2532] },
  { iata: 'HND', city: 'Tokio', country: 'Japan', coordinates: [139.7798, 35.5494] },
  { iata: 'SIN', city: 'Singapur', country: 'Singapur', coordinates: [103.994, 1.3644] },
  { iata: 'SYD', city: 'Sydney', country: 'Australien', coordinates: [151.1772, -33.9399] },
  { iata: 'CPT', city: 'Kapstadt', country: 'Südafrika', coordinates: [18.6017, -33.97] },
  { iata: 'GRU', city: 'São Paulo', country: 'Brasilien', coordinates: [-46.4731, -23.4356] },
  { iata: 'MEX', city: 'Mexiko-Stadt', country: 'Mexiko', coordinates: [-99.0721, 19.4361] },
  { iata: 'YVR', city: 'Vancouver', country: 'Kanada', coordinates: [-123.184, 49.1947] },
  { iata: 'KEF', city: 'Reykjavík', country: 'Island', coordinates: [-22.6056, 63.985] },
]

export function airportByIata(iata: string, fallback: Airport): Airport {
  return AIRPORTS.find((airport) => airport.iata === iata.toUpperCase()) ?? fallback
}

export function distanceBetweenAirports(origin: Airport, destination: Airport): number {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const lat1 = radians(origin.coordinates[1])
  const lat2 = radians(destination.coordinates[1])
  const dLat = lat2 - lat1
  const dLon = radians(destination.coordinates[0] - origin.coordinates[0])
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)))
}
