#!/usr/bin/env python3
"""
Generate HK MTR lines and stations GeoJSON for MapLibre.

Joins official MTR lines/stations CSV with hardcoded station coordinates
(sourced from OSM/Wikipedia; fixed network so no live fetch needed).

Outputs:
  - public/map/overlays/hk_mtr_lines.geojson
  - public/map/overlays/hk_mtr_stations.geojson

Usage:
  python3 scripts/gen-hk-mtr.py \
    ~/Downloads/"mtr_lines_and_stations (1).csv"
"""

import csv
import json
import sys

LINE_COLORS = {
    'AEL': '#1C7CBF',
    'DRL': '#EA0070',
    'EAL': '#53B7E8',
    'ISL': '#007B5E',
    'KTL': '#00A040',
    'SIL': '#CBD300',
    'TCL': '#F7943E',
    'TKL': '#6B208B',
    'TML': '#923011',
    'TWL': '#E60012',
}

LINE_NAMES = {
    'AEL': 'Airport Express',
    'DRL': 'Disneyland Resort Line',
    'EAL': 'East Rail Line',
    'ISL': 'Island Line',
    'KTL': 'Kwun Tong Line',
    'SIL': 'South Island Line',
    'TCL': 'Tung Chung Line',
    'TKL': 'Tseung Kwan O Line',
    'TML': 'Tuen Ma Line',
    'TWL': 'Tsuen Wan Line',
}

# (lon, lat) — sourced from OSM/Wikipedia, accurate to ~50m
STATION_COORDS = {
    'ADM': (114.1651, 22.2793),   # Admiralty
    'AIR': (113.9367, 22.3159),   # Airport
    'AUS': (114.1665, 22.3033),   # Austin
    'AWE': (113.9401, 22.3228),   # AsiaWorld-Expo
    'CAB': (114.1840, 22.2800),   # Causeway Bay
    'CEN': (114.1576, 22.2820),   # Central
    'CHH': (114.2137, 22.3354),   # Choi Hung
    'CHW': (114.2370, 22.2647),   # Chai Wan
    'CIO': (114.2054, 22.3983),   # City One
    'CKT': (114.1873, 22.3790),   # Che Kung Temple
    'CSW': (114.1561, 22.3355),   # Cheung Sha Wan
    'DIH': (114.2071, 22.3404),   # Diamond Hill
    'DIS': (114.0447, 22.3131),   # Disneyland Resort
    'ETS': (114.1756, 22.2983),   # East Tsim Sha Tsui
    'EXC': (114.1743, 22.2809),   # Exhibition Centre
    'FAN': (114.1388, 22.4920),   # Fanling
    'FOH': (114.1942, 22.2872),   # Fortress Hill
    'FOT': (114.1980, 22.3959),   # Fo Tan
    'HAH': (114.2644, 22.3170),   # Hang Hau
    'HEO': (114.2311, 22.4175),   # Heng On
    'HFC': (114.2416, 22.2740),   # Heng Fa Chuen
    'HIK': (114.1870, 22.3530),   # Hin Keng
    'HKU': (114.1352, 22.2841),   # HKU
    'HOK': (114.1582, 22.2851),   # Hong Kong
    'HOM': (114.1837, 22.3097),   # Ho Man Tin
    'HUH': (114.1823, 22.3029),   # Hung Hom
    'JOR': (114.1716, 22.3050),   # Jordan
    'KAT': (114.2039, 22.3290),   # Kai Tak
    'KET': (114.1287, 22.2811),   # Kennedy Town
    'KOB': (114.2137, 22.3234),   # Kowloon Bay
    'KOT': (114.1762, 22.3364),   # Kowloon Tong
    'KOW': (114.1614, 22.3048),   # Kowloon
    'KSR': (114.0637, 22.4296),   # Kam Sheung Road
    'KWF': (114.1232, 22.3594),   # Kwai Fong
    'KWH': (114.1310, 22.3635),   # Kwai Hing
    'KWT': (114.2267, 22.3117),   # Kwun Tong
    'LAK': (114.1254, 22.3718),   # Lai King
    'LAT': (114.2328, 22.3085),   # Lam Tin
    'LCK': (114.1483, 22.3378),   # Lai Chi Kok
    'LET': (114.1551, 22.2417),   # Lei Tung
    'LHP': (114.2731, 22.2958),   # LOHAS Park
    'LMC': (114.0697, 22.5299),   # Lok Ma Chau
    'LOF': (114.1873, 22.3396),   # Lok Fu
    'LOP': (114.0341, 22.4468),   # Long Ping
    'LOW': (114.1124, 22.5276),   # Lo Wu
    'MEF': (114.1376, 22.3381),   # Mei Foo
    'MKK': (114.1877, 22.3225),   # Mong Kok East
    'MOK': (114.1695, 22.3193),   # Mong Kok
    'MOS': (114.2313, 22.4253),   # Ma On Shan
    'NAC': (114.1545, 22.3274),   # Nam Cheong
    'NOP': (114.2002, 22.2907),   # North Point
    'NTK': (114.2197, 22.3153),   # Ngau Tau Kok
    'OCP': (114.1747, 22.2481),   # Ocean Park
    'OLY': (114.1599, 22.3183),   # Olympic
    'POA': (114.2578, 22.3226),   # Po Lam
    'PRE': (114.1681, 22.3245),   # Prince Edward
    'QUB': (114.2098, 22.2881),   # Quarry Bay
    'SHM': (114.2231, 22.4055),   # Shek Mun
    'SHS': (114.1283, 22.5013),   # Sheung Shui
    'SHT': (114.1871, 22.3817),   # Sha Tin
    'SHW': (114.1509, 22.2870),   # Sheung Wan
    'SIH': (113.9843, 22.4088),   # Siu Hong
    'SKM': (114.1680, 22.3319),   # Shek Kip Mei
    'SKW': (114.2295, 22.2795),   # Shau Kei Wan
    'SOH': (114.1498, 22.2387),   # South Horizons
    'SSP': (114.1620, 22.3305),   # Sham Shui Po
    'STW': (114.1921, 22.3834),   # Sha Tin Wai
    'SUN': (114.0300, 22.3375),   # Sunny Bay
    'SUW': (114.1986, 22.3226),   # Sung Wong Toi
    'SWH': (114.2228, 22.2825),   # Sai Wan Ho
    'SYP': (114.1424, 22.2860),   # Sai Ying Pun
    'TAK': (114.2160, 22.2848),   # Tai Koo
    'TAP': (114.1715, 22.4444),   # Tai Po Market
    'TAW': (114.1797, 22.3726),   # Tai Wai
    'TIH': (114.1920, 22.2824),   # Tin Hau
    'TIK': (114.2538, 22.3041),   # Tiu Keng Leng
    'TIS': (114.0013, 22.4590),   # Tin Shui Wai
    'TKO': (114.2604, 22.3072),   # Tseung Kwan O
    'TKW': (114.1900, 22.3183),   # To Kwa Wan
    'TSH': (114.2523, 22.4190),   # Tai Shui Hang
    'TST': (114.1722, 22.2973),   # Tsim Sha Tsui
    'TSW': (114.1196, 22.3729),   # Tsuen Wan
    'TSY': (114.1088, 22.3588),   # Tsing Yi
    'TUC': (113.9416, 22.2889),   # Tung Chung
    'TUM': (113.9732, 22.3955),   # Tuen Mun
    'TWH': (114.1204, 22.3683),   # Tai Wo Hau
    'TWO': (114.1635, 22.4509),   # Tai Wo
    'TWW': (114.1086, 22.3671),   # Tsuen Wan West
    'UNI': (114.2100, 22.4134),   # University
    'WAC': (114.1731, 22.2775),   # Wan Chai
    'WCH': (114.1697, 22.2464),   # Wong Chuk Hang
    'WHA': (114.1898, 22.3042),   # Whampoa
    'WKS': (114.2783, 22.4292),   # Wu Kai Sha
    'WTS': (114.1955, 22.3417),   # Wong Tai Sin
    'YAT': (114.2377, 22.2963),   # Yau Tong
    'YMT': (114.1705, 22.3129),   # Yau Ma Tei
    'YUL': (114.0231, 22.4453),   # Yuen Long
}


def read_csv(path):
    routes = {}   # (line_code, direction) -> [(seq, station_code)]
    stations = {} # station_code -> {name_en, name_zh}

    with open(path, newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            code = row['Station Code'].strip()
            if not code:
                continue
            line = row['Line Code'].strip()
            direction = row['Direction'].strip()
            seq = float(row['Sequence'])

            key = (line, direction)
            if key not in routes:
                routes[key] = []
            routes[key].append((seq, code))

            if code not in stations:
                stations[code] = {
                    'name_en': row['English Name'].strip(),
                    'name_zh': row['Chinese Name'].strip(),
                }

    for key in routes:
        routes[key].sort()
        routes[key] = [c for _, c in routes[key]]

    return routes, stations


def select_routes(routes):
    # Keep outbound (DT) directions only — UT is just the reverse path
    return {k: v for k, v in routes.items() if 'UT' not in k[1]}


def build_lines_geojson(routes, stations):
    features = []
    missing = set()

    for (line, direction), codes in sorted(routes.items()):
        coords = []
        for code in codes:
            if code in STATION_COORDS:
                coords.append(list(STATION_COORDS[code]))
            else:
                missing.add(code)

        if len(coords) < 2:
            print(f'  SKIP {line}/{direction}: only {len(coords)} coords', file=sys.stderr)
            continue

        features.append({
            'type': 'Feature',
            'geometry': {'type': 'LineString', 'coordinates': coords},
            'properties': {
                'line_code': line,
                'direction': direction,
                'name': LINE_NAMES.get(line, line),
                'color': LINE_COLORS.get(line, '#888888'),
            },
        })

    if missing:
        print(f'  WARNING: no coords for: {sorted(missing)}', file=sys.stderr)

    return {'type': 'FeatureCollection', 'features': features}


def build_stations_geojson(stations):
    features = []
    for code, info in sorted(stations.items()):
        if code not in STATION_COORDS:
            continue
        features.append({
            'type': 'Feature',
            'geometry': {'type': 'Point', 'coordinates': list(STATION_COORDS[code])},
            'properties': {
                'code': code,
                'name': info['name_en'],
                'name_zh': info['name_zh'],
            },
        })
    return {'type': 'FeatureCollection', 'features': features}


def main():
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <path-to-csv> [output-dir]', file=sys.stderr)
        sys.exit(1)

    csv_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else 'public/map/overlays'

    print('Reading CSV...', file=sys.stderr)
    routes, stations = read_csv(csv_path)
    routes = select_routes(routes)
    print(f'  {len(stations)} stations, {len(routes)} route variants', file=sys.stderr)

    lines_geojson = build_lines_geojson(routes, stations)
    stations_geojson = build_stations_geojson(stations)

    lines_path = f'{out_dir}/hk_mtr_lines.geojson'
    stations_path = f'{out_dir}/hk_mtr_stations.geojson'

    with open(lines_path, 'w') as f:
        json.dump(lines_geojson, f)
    print(f'Wrote {len(lines_geojson["features"])} line features → {lines_path}', file=sys.stderr)

    with open(stations_path, 'w') as f:
        json.dump(stations_geojson, f)
    print(f'Wrote {len(stations_geojson["features"])} station features → {stations_path}', file=sys.stderr)


if __name__ == '__main__':
    main()
