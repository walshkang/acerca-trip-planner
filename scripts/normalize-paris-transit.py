#!/usr/bin/env python3
"""
Normalize IDFM Paris transit CSV → transit-manual/paris.geojson

Input:  traces-des-lignes-de-transport-en-commun-idfm.csv
Output: paris.geojson  (upload to Supabase Storage transit-manual/paris.geojson)

Usage:
  python3 scripts/normalize-paris-transit.py \
    ~/Downloads/traces-des-lignes-de-transport-en-commun-idfm.csv \
    paris.geojson
"""

import csv
import json
import sys

csv.field_size_limit(10_000_000)

ROUTE_TYPE_MAP = {
    'Subway':    1,
    'Tram':      0,
    'Rail':      2,
}

CANONICAL_MODE_MAP = {
    0: 'tram',
    1: 'subway',
    2: 'rail',
}

DEFAULT_COLOR = '555555'

INCLUDE_TYPES = set(ROUTE_TYPE_MAP.keys())


def normalize_color(raw: str) -> str:
    c = raw.strip().lstrip('#').upper()
    return c if len(c) == 6 else DEFAULT_COLOR


def to_multilinestring(shape: dict) -> dict | None:
    """Ensure geometry is a MultiLineString. Returns None if unusable."""
    geo_type = shape.get('type')
    coords = shape.get('coordinates')
    if not coords:
        return None
    if geo_type == 'MultiLineString':
        return shape
    if geo_type == 'LineString':
        return {'type': 'MultiLineString', 'coordinates': [coords]}
    return None


def main(input_path: str, output_path: str) -> None:
    features = []

    with open(input_path, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            route_type_str = row['route_type'].strip()
            if route_type_str not in INCLUDE_TYPES:
                continue

            shape_raw = row.get('shape', '').strip()
            if not shape_raw:
                continue

            try:
                shape = json.loads(shape_raw)
            except json.JSONDecodeError:
                print(f"  SKIP (bad shape JSON): {row['route_short_name']}", file=sys.stderr)
                continue

            geometry = to_multilinestring(shape)
            if not geometry:
                print(f"  SKIP (unusable geometry type): {row['route_short_name']}", file=sys.stderr)
                continue

            route_type_num = ROUTE_TYPE_MAP[route_type_str]
            canonical_mode = CANONICAL_MODE_MAP[route_type_num]

            features.append({
                'type': 'Feature',
                'geometry': geometry,
                'properties': {
                    'route_short_name': row['route_short_name'].strip(),
                    'route_color': normalize_color(row.get('route_color', '')),
                    'route_type': route_type_num,
                    'canonical_mode': canonical_mode,
                },
            })

    feature_collection = {'type': 'FeatureCollection', 'features': features}

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(feature_collection, f, separators=(',', ':'))

    by_mode: dict[str, int] = {}
    for feat in features:
        m = feat['properties']['canonical_mode']
        by_mode[m] = by_mode.get(m, 0) + 1

    print(f"Written {len(features)} features to {output_path}")
    for mode, count in sorted(by_mode.items()):
        print(f"  {mode}: {count}")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
