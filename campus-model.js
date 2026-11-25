/*
 * Columbia Morningside Heights axonometric model.
 * Building footprints and road geometry are projected from their real
 * latitude/longitude coordinates; landmark details are added in SVG.
 */
(function () {
  const BOUNDS = {
    north: 40.81065,
    south: 40.80545,
    west: -73.9649,
    east: -73.9591,
  };
  const VIEW = { width: 1500, height: 960, centerX: 750, centerY: 451 };
  const ROTATION_STEP = 15;
  const LANDMARKS = [
    {
      name: "Broadway Gate",
      label: "Broadway Gate",
      subtitle: "West entrance · College Walk",
      lat: 40.807987,
      lng: -73.963801,
      kind: "gate",
      labelOffset: [-74, -42],
      description: "The ceremonial western threshold where College Walk meets Broadway, framed by stone piers and ornamental ironwork.",
    },
    {
      name: "Low Memorial Library",
      label: "Low Library",
      subtitle: "Rotunda · 1897",
      kind: "low",
      labelOffset: [48, -74],
      description: "The granite centerpiece of the original campus plan, crowned by its monumental dome and reached through broad ceremonial steps.",
    },
    {
      name: "Alma Mater",
      label: "Alma Mater",
      subtitle: "Sculpture · Daniel Chester French",
      lat: 40.8078056,
      lng: -73.962156,
      kind: "statue",
      labelOffset: [-96, 14],
      description: "The bronze Alma Mater stands on the centerline of the south steps of Low Library.",
    },
    {
      name: "Butler Library",
      label: "Butler Library",
      subtitle: "South campus · 1934",
      kind: "butler",
      labelOffset: [22, 34],
      description: "The long colonnaded library facade closes the south side of the central campus and anchors the main undergraduate library.",
    },
    {
      name: "Saint Paul's Chapel",
      label: "St. Paul's Chapel",
      subtitle: "Chapel · 1907",
      kind: "chapel",
      labelOffset: [-108, 50],
      description: "A domed chapel and one of the clearest secondary landmarks on the eastern half of campus.",
    },
    {
      name: "Pupin Hall",
      label: "Pupin Hall",
      subtitle: "Physics · 1927",
      kind: "pupin",
      labelOffset: [62, -42],
      description: "The physics building where key early research on the Compton effect took place.",
    },
    {
      name: "Earl Hall",
      label: "Earl Hall",
      subtitle: "Religious life · 1902",
      kind: "earl",
      labelOffset: [-58, -34],
      description: "A small classical building near the western quadrangle, marked here with its tower-like entrance bay.",
    },
    {
      name: "Amsterdam Gate",
      label: "Amsterdam Gate",
      subtitle: "East entrance · College Walk",
      lat: 40.8068316,
      lng: -73.9610565,
      kind: "gate",
      labelOffset: [26, 48],
      description: "The eastern gate closes College Walk at Amsterdam Avenue, opposite the Broadway entrance.",
    },
  ];
  const LANDMARK_BY_NAME = new Map(LANDMARKS.map((item) => [item.name, item]));
  // NYC Open Data (5zhs-2jue), matched to OSM by footprint overlap. Heights are in meters.
  const CITY_ROOF_HEIGHTS = {
    271585091: 46.9, 271585096: 27.4, 271585099: 27.1, 271585100: 27.1, 271585101: 17.9, 271585102: 15.1,
    271585103: 17.8, 271585105: 21.8, 271585106: 17.8, 271585107: 14.7, 271585109: 14.8, 271585110: 17.8,
    271585111: 14.8, 271585112: 15.5, 271585114: 27.4, 271585115: 27.7, 271585116: 18.2, 271585117: 14.8,
    271585118: 17, 271585119: 14.8, 271585120: 17.1, 271585121: 15.2, 271585122: 17, 271585123: 18.7,
    271585124: 16.8, 271585125: 17.5, 271585126: 16.7, 271585127: 17.3, 271585128: 16.1, 271585129: 17.7,
    271585130: 16.1, 271585131: 17.8, 271585132: 16.1, 271585133: 17.8, 271585141: 17.8, 271585143: 55,
    271585144: 29.8, 271916914: 38.2, 271916929: 7.2, 271917055: 43, 271917086: 44.1, 271917090: 36.9,
    271921501: 22.2, 271921508: 21.1, 271921510: 19.1, 271921517: 35.5, 274982902: 41.1, 274982919: 42.7,
    274982920: 42.4, 274985931: 58.3, 274985932: 26.6, 274985933: 30.2, 274985934: 30.2, 274985935: 31.7,
    274985936: 34.4, 274985937: 34.6, 274985938: 37.7, 274985939: 37.9, 274985940: 37.7, 274985941: 37.3,
    274985947: 44.6, 274985948: 44.2, 274985950: 41.5, 274985952: 40.9, 274985953: 20.4, 274985956: 59.7,
    274985961: 26.9, 274985963: 58.5, 274985964: 5.4, 274985965: 20.3, 274995718: 33.8, 274995720: 13,
    274995721: 37.1, 274995723: 31.2, 274995724: 39, 274995725: 31, 274995726: 18.7, 274995727: 33.5,
    274995729: 49.1, 274995730: 26.9, 274995731: 32.6, 274995733: 31.1, 274995734: 38.1, 274995736: 44.9,
    274995737: 25.8, 274995738: 20.4, 274995740: 22.2, 274995742: 20.1, 274995744: 19.8, 274995746: 19.8,
    274995748: 14.2, 274995750: 34.1, 274995753: 47.2, 274995755: 25.6, 274995757: 40.9, 274995760: 26.2,
    274995762: 69.5, 274995764: 64.3, 274995765: 29, 274995766: 20.9, 274995768: 35.3, 274995769: 50.3,
    274995770: 29.9, 274995779: 32.1, 274995785: 45.7, 274995787: 25.2, 274995789: 25.6, 274996136: 21.5,
    274996137: 23.8, 723008687: 12.7, 738973811: 26.5, 738973812: 47.9,
  };
  // NYC Pupin Hall footprint, with survey vertices simplified to 0.65 m for rendering.
  const CITY_FOOTPRINTS = {
    738973812: [
      [40.8098751, -73.9611154],
      [40.8098008, -73.9611692],
      [40.8098607, -73.9613124],
      [40.8098871, -73.9612933],
      [40.8099291, -73.9613939],
      [40.8099113, -73.9614068],
      [40.8098832, -73.9613394],
      [40.8098633, -73.9613538],
      [40.8098915, -73.9614212],
      [40.8098761, -73.9614323],
      [40.8099146, -73.9615243],
      [40.8099676, -73.961486],
      [40.8100086, -73.961584],
      [40.8099859, -73.9616004],
      [40.8100452, -73.9617424],
      [40.8101952, -73.9616338],
      [40.8099545, -73.9610579],
      [40.8098751, -73.9611154],
    ],
  };
  // Diana Center's published seven stories conflict with the 5.4 m source value.
  const DIANA_CENTER_ID = 274985964;
  const DOME_BUILDINGS = /^(low (memorial )?library|st\.? paul.s chapel|saint paul.s chapel)$/i;
  // Building footprint and roof height from NYC BUILDING, BIN 1084846.
  const HAMILTON_HALL = { id: 1084846, name: 'Hamilton Hall', height: 30.1, poly: [
    [40.8065794, -73.9614450],
    [40.8065957, -73.9614836],
    [40.8066076, -73.9615118],
    [40.8066241, -73.9614997],
    [40.8066695, -73.9614665],
    [40.8068213, -73.9618260],
    [40.8069155, -73.9620489],
    [40.8069655, -73.9620123],
    [40.8070168, -73.9619748],
    [40.8070340, -73.9619622],
    [40.8070435, -73.9619553],
    [40.8067693, -73.9613061],
    [40.8067384, -73.9613287],
    [40.8066829, -73.9613693],
    [40.8065794, -73.9614450],
  ] };
  // Local axes follow College Walk and the Manhattan street grid. Offsets are in meters.
  const COLLEGE_WALK_ORIGIN = [40.8072178, -73.961974];
  const CAMPUS_RECT = [[-164,-157],[76,-157],[77,303],[-164,303]];
  const CAMPUS_STREET_RECT = [[-198,-181],[106,-181],[107,332],[-198,332]];
  const MODEL_STATE = {
    rotation: 69,
    pitch: 35,
    labels: true,
    roads: true,
    selected: "",
    zoom: 2,
    panX: 1.97,
    panY: 130.51,
    built: false,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function polygonCentroid(poly) {
    const [originLat, originLng] = poly[0];
    let area = 0;
    let lat = 0;
    let lng = 0;
    for (let index = 0; index < poly.length; index += 1) {
      const a = poly[index];
      const b = poly[(index + 1) % poly.length];
      const aLat = a[0] - originLat;
      const aLng = a[1] - originLng;
      const bLat = b[0] - originLat;
      const bLng = b[1] - originLng;
      const cross = aLng * bLat - bLng * aLat;
      area += cross;
      lat += (aLat + bLat) * cross;
      lng += (aLng + bLng) * cross;
    }
    if (area === 0) return poly[0];
    return [originLat + lat / (3 * area), originLng + lng / (3 * area)];
  }

  function normalizeBuildingName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "");
  }

  function inBounds(lat, lng, padding = 0) {
    return lat > BOUNDS.south - padding && lat < BOUNDS.north + padding
      && lng > BOUNDS.west - padding && lng < BOUNDS.east + padding;
  }

  function pointInPolygon(lat, lng, poly) {
    let inside = false;
    for (let index = 0, previous = poly.length - 1; index < poly.length; previous = index++) {
      const yi = Number(poly[index].lat ?? poly[index][0]);
      const xi = Number(poly[index].lon ?? poly[index][1]);
      const yj = Number(poly[previous].lat ?? poly[previous][0]);
      const xj = Number(poly[previous].lon ?? poly[previous][1]);
      const intersects = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / ((yj - yi) || Number.EPSILON) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function offsetGeo(lat, lng, xMeters, yMeters) {
    return [
      lat + yMeters / 110540,
      lng + xMeters / (111320 * Math.cos(lat * Math.PI / 180)),
    ];
  }

  function geoDistanceMeters(aLat, aLng, bLat, bLng) {
    const x = (bLng - aLng) * 111320 * Math.cos((aLat + bLat) * Math.PI / 360);
    const y = (bLat - aLat) * 110540;
    return Math.hypot(x, y);
  }

  function campusOffset(east, north) {
    const [lat, lon] = offsetGeo(...COLLEGE_WALK_ORIGIN, 0.875 * east + 0.484 * north, -0.484 * east + 0.875 * north);
    return { lat, lon };
  }

  const LOW_TERRACE_BREAKS = [12,22,56,72];

  function campusElevation(lat,lng) {
    const [east,north] = campusMeters(lat,lng);
    if (east < -164.15 || east > 77.15 || north > 303.15) return 0;
    const lower = clamp((north-12)/10,0,1)*3.4;
    const upper = clamp((north-56)/16,0,1)*4.2;
    return lower + upper;
  }

  function campusArea(project, corners, elevation = 0) {
    const geometry = corners.flatMap(([east,north],index)=>{
      const [endEast,endNorth]=corners[(index+1)%corners.length];
      const breaks=LOW_TERRACE_BREAKS.filter((y)=>y>Math.min(north,endNorth) && y<Math.max(north,endNorth));
      if(endNorth<north) breaks.reverse();
      return [campusOffset(east,north),...breaks.map((y)=>campusOffset(east+(endEast-east)*(y-north)/(endNorth-north),y))];
    });
    return polygonPath(project,geometry,elevation);
  }

  function makeProjection(rotation, pitch) {
    const centerLat = (BOUNDS.north + BOUNDS.south) / 2;
    const centerLng = (BOUNDS.west + BOUNDS.east) / 2;
    const angle = rotation * Math.PI / 180;
    const pitchRadians = pitch * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const depthScale = Math.sin(pitchRadians);
    const heightScale = Math.cos(pitchRadians);
    const metersPerLng = 111320 * Math.cos(centerLat * Math.PI / 180);
    const raw = (lat, lng) => {
      const x = (lng - centerLng) * metersPerLng;
      const y = (lat - centerLat) * 110540;
      return [x * cos - y * sin, -(x * sin + y * cos) * depthScale];
    };
    const corners = [
      raw(BOUNDS.south, BOUNDS.west),
      raw(BOUNDS.south, BOUNDS.east),
      raw(BOUNDS.north, BOUNDS.west),
      raw(BOUNDS.north, BOUNDS.east),
    ];
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const scale = Math.min(1050 / Math.max(1, spanX), 610 / Math.max(1, spanY));
    const offsetX = VIEW.centerX - ((Math.min(...xs) + Math.max(...xs)) / 2) * scale;
    const offsetY = VIEW.centerY - ((Math.min(...ys) + Math.max(...ys)) / 2) * scale;
    return (lat, lng, elevation = 0) => {
      const point = raw(lat, lng);
      return [
        point[0] * scale + offsetX,
        point[1] * scale + offsetY - elevation * scale * heightScale,
      ];
    };
  }

  function pointsAttr(points) {
    return points.map((point) => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ");
  }

  function polygonPoints(project, poly, elevation = 0) {
    return pointsAttr(poly.map((point) => project(Number(point[0]), Number(point[1]), elevation)));
  }

  function pathForGeometry(project, geometry, elevation = 0) {
    return geometry.map((point, index) => {
      const p = project(Number(point.lat), Number(point.lon), elevation);
      return `${index ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    }).join(" ");
  }

  function clipGeometryRuns(geometry) {
    const runs = [];
    let run = [];
    for (let index = 1; index < geometry.length; index += 1) {
      const a = geometry[index - 1];
      const b = geometry[index];
      let start = 0;
      let end = 1;
      for (const [coordinate, min, max] of [["lat", BOUNDS.south, BOUNDS.north], ["lon", BOUNDS.west, BOUNDS.east]]) {
        const delta = b[coordinate] - a[coordinate];
        if (delta === 0) {
          if (a[coordinate] < min || a[coordinate] > max) end = -1;
          continue;
        }
        const first = (min - a[coordinate]) / delta;
        const last = (max - a[coordinate]) / delta;
        start = Math.max(start, Math.min(first, last));
        end = Math.min(end, Math.max(first, last));
      }
      if (start >= end) {
        run = [];
        continue;
      }
      const at = (fraction) => ({
        lat: a.lat + (b.lat - a.lat) * fraction,
        lon: a.lon + (b.lon - a.lon) * fraction,
      });
      if (!run.length || start > 0) {
        run = [at(start)];
        runs.push(run);
      }
      run.push(at(end));
      if (end < 1) run = [];
    }
    return runs;
  }

  function geometryLengthMeters(geometry) {
    let length = 0;
    for (let index = 1; index < geometry.length; index += 1) {
      const a = geometry[index - 1];
      const b = geometry[index];
      const x = (Number(b.lon) - Number(a.lon)) * 111320 * Math.cos(Number(a.lat) * Math.PI / 180);
      const y = (Number(b.lat) - Number(a.lat)) * 110540;
      length += Math.hypot(x, y);
    }
    return length;
  }

  function polygonPath(project, poly, elevation = 0) {
    const points = poly.map((point) => {
      const lat = Number(point.lat ?? point[0]);
      const lon = Number(point.lon ?? point[1]);
      const p = project(lat, lon, elevation);
      return `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    });
    return `M${points.join(" L")} Z`;
  }

  function drawFacade(project, a, b, height, levels, landmark, brick) {
    const length = geoDistanceMeters(...a, ...b);
    if (length < 8 || height < 9) return "";
    const bays = clamp(Math.round(length / 6), 2, 20);
    const floors = clamp(Math.round(levels || height / 4), 2, 18);
    const point = (fraction, elevation) => project(
      a[0] + (b[0] - a[0]) * fraction,
      a[1] + (b[1] - a[1]) * fraction,
      elevation,
    );
    const lines = [];
    for (let floor = 0; floor < floors; floor += 1) {
      const bottom = (floor + 0.24) * height / floors;
      const top = (floor + 0.73) * height / floors;
      for (let bay = 0; bay < bays; bay += 1) {
        const left = (bay + 0.32) / bays;
        const right = (bay + 0.68) / bays;
        const corners = [point(left, bottom), point(right, bottom), point(right, top), point(left, top)];
        lines.push("M" + pointsAttr(corners).replaceAll(" ", "L") + "Z");
      }
    }
    const windowStyle = brick
      ? 'fill="#3d3934" fill-opacity=".66" stroke="#dacbb2" stroke-opacity=".72" stroke-width=".42"'
      : `fill="#575b59" fill-opacity="${landmark ? ".25" : ".16"}"`;
    const windows = `<path d="${lines.join("")}" ${windowStyle} />`;
    const strip = (left, right, bottom, top) => `<polygon fill="#b7a68c" points="${pointsAttr([
      point(left,bottom), point(right,bottom), point(right,top), point(left,top),
    ])}" />`;
    const trim = [];
    if (brick) {
      const upperBand = height * .79;
      trim.push(strip(0,1,upperBand,height));
      const groups = Math.ceil(bays / 3);
      for (let index = 0; index <= groups; index += 1) {
        const division = Math.min(index * 3, bays) / bays;
        const halfWidth = .08 / bays;
        trim.push(strip(Math.max(0,division-halfWidth), Math.min(1,division+halfWidth), 0, upperBand));
      }
    }
    const bandLevels = brick ? [Math.min(1.1, height * .12), height - 1, ...(floors >= 5 ? [height * .77] : [])] : [height - 1];
    const cornice = bandLevels.map((level) => `<polyline points="${pointsAttr([point(0, level), point(1, level)])}" fill="none" stroke="${brick ? "#d3c3a7" : "#6e6e66"}" stroke-width="${brick ? ".85" : ".55"}" stroke-opacity=".78" />`).join("");
    return `<g aria-hidden="true" pointer-events="none">${trim.join("")}${windows}${cornice}</g>`;
  }

  function butlerFront(project, a, b, height, wing) {
    const point = (x,z) => project(a[0]+(b[0]-a[0])*x, a[1]+(b[1]-a[1])*x, z*height);
    const patch = (corners, fill, stroke = "none") => `<polygon points="${pointsAttr(corners.map(([x,z]) => point(x,z)))}" fill="${fill}" stroke="${stroke}" stroke-width=".38" />`;
    const panel = (x1,x2,z1,z2,fill,stroke) => patch([[x1,z1],[x2,z1],[x2,z2],[x1,z2]],fill,stroke);
    const arch = (x, width, bottom, spring, rise, fill) => {
      const crown = Array.from({length:9}, (_, index) => {
        const angle = Math.PI * index / 8;
        return [x + width * Math.cos(angle),spring + rise * Math.sin(angle)];
      });
      return patch([[x+width,bottom],...crown,[x-width,bottom]],fill);
    };
    const stone = "#d8ccb5";
    const shade = "#938673";
    const glass = "#393e3c";
    const details = [panel(0,1,.11,.16,shade),panel(0,1,.95,1,stone)];
    if (wing) {
      details.push(panel(.13,.87,.17,.93,"#8c6257"),arch(.5,.25,.19,.60,.16,stone),
        arch(.5,.18,.22,.60,.10,glass),panel(.28,.72,.79,.91,stone),
        panel(.34,.47,.81,.89,glass),panel(.53,.66,.81,.89,glass));
    } else {
      details.push(panel(.025,.975,.24,.80,glass),panel(0,1,.80,.86,shade),panel(0,1,.86,.90,stone),
        panel(.456,.544,0,.236,shade),panel(.472,.528,0,.197,glass),panel(.426,.574,.215,.252,stone));
      for (let index = 0; index < 14; index += 1) {
        const x = (index + .5) / 14;
        details.push(patch([[x-.012,.24],[x+.012,.24],[x+.009,.78],[x-.009,.78]],stone),
          panel(x-.015,x+.015,.234,.255,"#b9aa91"),
          panel(x-.014,x+.014,.767,.80,"#e5dac6"));
      }
    }
    return `<g aria-hidden="true" pointer-events="none">${details.join("")}</g>`;
  }

  function lowPortico(project, a, b, height) {
    const point = (x,z) => project(a[0]+(b[0]-a[0])*x,a[1]+(b[1]-a[1])*x,z*height);
    const panel = (x1,x2,z1,z2,fill) => `<polygon fill="${fill}" points="${pointsAttr([
      point(x1,z1),point(x2,z1),point(x2,z2),point(x1,z2),
    ])}"/>`;
    const detail = [panel(.025,.975,.075,.69,"#aaa397"),panel(.42,.58,.075,.54,"#44494b")];
    for (let bay=1;bay<9;bay+=1) {
      if (bay===4 || bay===5) continue;
      const x = .06 + bay*.098;
      detail.push(panel(x-.024,x+.024,.15,.31,"#616966"),panel(x-.024,x+.024,.43,.56,"#616966"));
    }
    for (let column=0;column<10;column+=1) {
      const x = .065 + column*.097;
      detail.push(panel(x-.019,x+.020,.077,.66,"#e0dacf"),
        panel(x+.012,x+.020,.10,.635,"#b6afa2"),
        panel(x-.023,x+.024,.077,.105,"#eee7d9"),
        panel(x-.025,x+.026,.635,.677,"#e9e1d3"));
    }
    detail.push(panel(0,1,.68,.715,"#8e887c"),panel(0,1,.715,.80,"#dbd3c4"),
      panel(0,1,.80,.826,"#9a9386"),panel(.04,.96,.826,.963,"#d5cec0"),
      panel(0,1,.963,1,"#b6b0a4"));
    return `<g aria-hidden="true" pointer-events="none">${detail.join("")}</g>`;
  }

  function drawDome(project, center, ring, height, rise, low = false) {
    const local = ring.map(([lat, lng]) => [
      (lng - center[1]) * 111320 * Math.cos(center[0] * Math.PI / 180),
      (lat - center[0]) * 110540,
    ]);
    let clearance = Infinity;
    for (let index = 0; index < local.length; index += 1) {
      const [x, y] = local[index];
      const [nextX, nextY] = local[(index + 1) % local.length];
      const dx = nextX - x;
      const dy = nextY - y;
      const fraction = clamp(-(x * dx + y * dy) / (dx * dx + dy * dy || 1), 0, 1);
      clearance = Math.min(clearance, Math.hypot(x + fraction * dx, y + fraction * dy));
    }
    const radius = Math.min(low ? 17 : 13, clearance * (low ? .94 : .8));
    if (radius < 2) return [];
    const tiers = low ? [[1,0],[1,.12],[.91,.42],[.77,.65],[.53,.85],[.29,.96],[0,1]]
      : [[1,0],[1,.24],[.91,.51],[.69,.75],[.38,.91],[0,1]];
    const segments = 24;
    const circles = tiers.map(([size, elevation]) => Array.from({ length: segments }, (_, index) => {
      const angle = index * 2 * Math.PI / segments;
      const point = offsetGeo(...center, radius * size * Math.cos(angle), radius * size * Math.sin(angle));
      return [...project(...point, height + rise * elevation), height + rise * elevation];
    }));
    const panels = [];
    for (let tier = 0; tier < circles.length - 1; tier += 1) {
      for (let index = 0; index < segments; index += 1) {
        const next = (index + 1) % segments;
        const points = [circles[tier][index], circles[tier][next], circles[tier + 1][next], circles[tier + 1][index]];
        const [a, b, c] = points;
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) >= 0) continue;
        const shade = Math.round(14 * Math.cos((index + 0.5) * 2 * Math.PI / segments - 2));
        panels.push(surface(points, `<polygon aria-hidden="true" pointer-events="none" stroke="#625f55" stroke-width=".38" points="${pointsAttr(points)}" fill="rgb(${(low ? 155 : 170) + shade} ${(low ? 158 : 194) + shade} ${(low ? 153 : 188) + shade})" />`));
      }
    }
    return panels;
  }

  function surface(points, markup, constantHeight) {
    const [a,b,c] = points;
    let dx = 0;
    let dy = 0;
    if (constantHeight == null) {
      const determinant = (b[0]-a[0]) * (c[1]-a[1]) - (b[1]-a[1]) * (c[0]-a[0]);
      dx = ((b[2]-a[2]) * (c[1]-a[1]) - (c[2]-a[2]) * (b[1]-a[1])) / determinant;
      dy = ((b[0]-a[0]) * (c[2]-a[2]) - (c[0]-a[0]) * (b[2]-a[2])) / determinant;
    }
    const x = points.map((point) => point[0]);
    const y = points.map((point) => point[1]);
    return {
      points, markup, dx, dy, offset: (constantHeight ?? a[2]) - a[0]*dx - a[1]*dy,
      left: Math.min(...x), right: Math.max(...x), top: Math.min(...y), bottom: Math.max(...y),
    };
  }

  // At the same screen point, higher elevation is closer to the camera.
  function occlusionPolygon(front, back, tieBreak) {
    const dx = front.dx - back.dx;
    const dy = front.dy - back.dy;
    const margin = Math.abs(dx) + Math.abs(dy) < 1e-7 && tieBreak ? -.0001 : .0001;
    const offset = front.offset - back.offset - margin;
    const difference = ([x,y]) => x*dx + y*dy + offset;
    const vertices = [];
    let previous = front.points.at(-1);
    let previousDepth = difference(previous);
    for (const point of front.points) {
      const depth = difference(point);
      if ((previousDepth >= 0) !== (depth >= 0)) {
        const t = previousDepth / (previousDepth - depth);
        vertices.push([previous[0] + (point[0]-previous[0])*t, previous[1] + (point[1]-previous[1])*t]);
      }
      if (depth >= 0) vertices.push(point);
      previous = point;
      previousDepth = depth;
    }
    return vertices;
  }

  function renderBuildingSurfaces(models) {
    const surfaces = models.flatMap(({faces}) => faces);
    const masks = [];
    for (const [index,back] of surfaces.entries()) {
      const blockers = [];
      for (const [otherIndex,front] of surfaces.entries()) {
        if (front === back || front.occludes === false || front.left >= back.right || front.right <= back.left
          || front.top >= back.bottom || front.bottom <= back.top) continue;
        const polygon = occlusionPolygon(front, back, otherIndex > index);
        if (polygon.length >= 3) blockers.push(`<polygon points="${pointsAttr(polygon)}" fill="#000" />`);
      }
      if (!blockers.length) continue;
      const id = `campus-surface-mask-${index}`;
      const x = back.left - 2;
      const y = back.top - 2;
      const width = back.right - back.left + 4;
      const height = back.bottom - back.top + 4;
      const bounds = `x="${x}" y="${y}" width="${width}" height="${height}"`;
      masks.push(`<mask id="${id}" maskUnits="userSpaceOnUse" ${bounds}><rect ${bounds} fill="#fff"/>${blockers.join("")}</mask>`);
      back.markup = `<g mask="url(#${id})">${back.markup}</g>`;
    }
    return `<defs>${masks.join("")}</defs>${models.map(({name,faces,node,landmark,selected}) =>
      landmark ? `<g class="campus-model-pin ${selected ? "active" : ""}" data-campus-landmark="${escapeXml(landmark)}">${faces.map(({markup})=>markup).join("")}</g>`
        : name === undefined ? faces.map(({markup})=>markup).join("")
        : `<g data-building="${escapeXml(name || "Context building")}">${faces.map(({markup}) => markup).join("")}</g>${node}`
    ).join("")}`;
  }

  function butlerRoof(project, height) {
    const perimeter = [[-74.45,-107.55],[-13.55,-107.55],[-13.55,-151.45],[-74.45,-151.45]];
    const inset = [[-73.2,-108.8],[-14.8,-108.8],[-14.8,-150.2],[-73.2,-150.2]];
    const outline = (corners, elevation) => corners.map(([east,north]) => {
      const {lat,lon} = campusOffset(east,north);
      return [...project(lat,lon,elevation),elevation];
    });
    const eave = outline(perimeter,height-.75);
    const cap = outline(inset,height);
    const materials = ["#b2c8c4","#8faeaa","#a2bdb9","#c3d4d0"];
    const faces = eave.map((point,index) => {
      const next = (index+1)%eave.length;
      const corners = [point,eave[next],cap[next],cap[index]];
      return surface(corners, `<polygon points="${pointsAttr(corners)}" fill="${materials[index]}" stroke="#78918e" stroke-width=".48"/>`);
    });
    const seams = Array.from({length:17}, (_,index) => {
      const east = -73.2 + (index+1) * (73.2-14.8)/18;
      return `<polyline points="${pointsAttr(outline([[east,-108.8],[east,-150.2]],height))}"/>`;
    }).join("");
    const top = `<polygon points="${pointsAttr(cap)}" fill="#c2d3cf" stroke="#829c97" stroke-width=".55"/>
      <g aria-hidden="true" pointer-events="none" fill="none" stroke="#849f9a" stroke-opacity=".55" stroke-width=".42">${seams}</g>`;
    return [...faces,surface(cap,top,height)];
  }

  function northwestFacade(project,a,b,height) {
    const length=geoDistanceMeters(...a,...b);
    if(length<9) return "";
    const point=(x,z)=>project(a[0]+(b[0]-a[0])*x,a[1]+(b[1]-a[1])*x,height*z);
    const panel=(left,right,low,high,fill)=>`<polygon points="${pointsAttr([
      point(left,low),point(right,low),point(right,high),point(left,high),
    ])}" fill="${fill}"/>`;
    const line=(coordinates,color,width)=>`<polyline points="${pointsAttr(coordinates.map(([x,z])=>point(x,z)))}"
      fill="none" stroke="${color}" stroke-width="${width}"/>`;
    const long=length>32;
    const start=long ? .08 : .075;
    const end=long ? .64 : .92;
    const bays=Math.max(4,Math.round(length*(end-start)/2.8));
    const floors=11;
    const detail=[panel(start,end,.17,.92,"#779a98"),panel(.04,.95,.025,.12,"#718d8e")];
    const glass=["#8cafaa","#9cb9b4","#729591","#a9c3bd","#628581"];
    for(let row=0;row<floors;row+=1) {
      const low=.17+.75*row/floors;
      const high=.17+.75*(row+1)/floors;
      for(let bay=0;bay<bays;bay+=1) {
        const left=start+(end-start)*bay/bays;
        const right=start+(end-start)*(bay+1)/bays;
        detail.push(panel(left,right,low,high,glass[(bay*7+row*11+Math.floor(row*bay/3))%glass.length]));
        detail.push(line([[left,low],[left,high]],"#b9c9c5",".40"));
      }
      detail.push(line([[start,high],[end,high]],"#bfccc8",".43"));
      if(long) detail.push(line([[end,high],[.97,high]],"#a7aaa2",".28"));
    }
    for(const [left,right,low,high] of long ? [[.65,.95,.17,.91],[.07,.91,.12,.17]] : [[.08,.92,.2,.86]]) {
      const segments=high-low>.4?3:1;
      for(let index=0;index<segments;index+=1) {
        const a=low+(high-low)*index/segments;
        const b=low+(high-low)*(index+1)/segments;
        detail.push(line(index%2?[[right,a],[left,b]]:[[left,a],[right,b]],"#dce0d7",".78"));
      }
    }
    return `<g aria-hidden="true" pointer-events="none">${detail.join("")}</g>`;
  }

  function urisWindowWall(project,a,b,height) {
    const length=geoDistanceMeters(...a,...b);
    if(length<27) return "";
    const point=(x,z)=>project(a[0]+(b[0]-a[0])*x,a[1]+(b[1]-a[1])*x,z*height);
    const panel=(a,b,c,d,fill)=>`<polygon points="${pointsAttr([point(a,c),point(b,c),point(b,d),point(a,d)])}" fill="${fill}"/>`;
    const bands=[panel(.09,.91,.055,.955,"#617985")];
    for(let index=0;index<=23;index+=1) {
      const x=.09+.82*index/23;
      bands.push(panel(x-.004,x+.004,.05,.96,index%2?"#b1b7b5":"#a5aeae"));
    }
    for(let floor=1;floor<8;floor+=1) {
      const y=.055+floor*.90/8;
      bands.push(panel(.09,.91,y-.008,y+.008,"#8d9b9e"));
    }
    return `<g aria-hidden="true" pointer-events="none">${bands.join("")}</g>`;
  }

  function extrudePrism(project, building, center, height, className, landmark, brick, baseHeight = 0) {
    const { poly, name, levels } = building;
    const ring = poly[0][0] === poly.at(-1)[0] && poly[0][1] === poly.at(-1)[1] ? poly.slice(0, -1) : poly;
    const base = ring.map(([lat, lng]) => [...project(lat, lng, baseHeight),baseHeight]);
    const roof = ring.map(([lat, lng]) => [...project(lat, lng, height),height]);
    const area = base.reduce((sum, point, index) => {
      const next = base[(index + 1) % base.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0);
    const faces = [];
    for (let index = 0; index < base.length; index += 1) {
      const next = (index + 1) % base.length;
      const dx = base[next][0] - base[index][0];
      if (Math.abs(dx) < .001 || dx * area >= 0) continue;
      const dy = base[next][1] - base[index][1];
      const fillClass = dx * dy < 0 ? "campus-block-side-a" : "campus-block-side-b";
      const points = [base[index], base[next], roof[next], roof[index]];
      const wall = `<polygon class="${className} ${fillClass}" points="${pointsAttr(points)}" />`;
      const facadeProject = baseHeight ? (lat,lng,z) => project(lat,lng,baseHeight+z) : project;
      const front = building.id === 274995721 && [1,3,9].includes(index);
      const lowFront = building.id === 274995757 && index === 12;
      const detail = building.id === 274995764
        ? northwestFacade(facadeProject,ring[index],ring[next],height-baseHeight)
        : className.includes("uris-tower")
        ? urisWindowWall(facadeProject,ring[index],ring[next],height-baseHeight)
        : lowFront ? lowPortico(project,ring[index],ring[next],height)
        : front ? butlerFront(project, ring[index], ring[next], height, index !== 1)
        : drawFacade(facadeProject, ring[index], ring[next], height-baseHeight, Number(levels), landmark, brick);
      faces.push(surface(points, wall + detail));
    }
    const rim = brick
      ? `<polygon class="campus-roof-rim" points="${pointsAttr(roof)}" />`
      : "";
    const roofMarkup = `<polygon class="${className} campus-block-roof" points="${pointsAttr(roof)}" />${rim}`;
    const hasDome = name !== "Low Memorial Library" && DOME_BUILDINGS.test(name || "");
    const inside = hasDome && pointInPolygon(...center, ring.map(([lat, lon]) => ({ lat, lon })));
    const dome = inside ? drawDome(project, center, ring, height, building.height - height) : [];
    return [...faces, surface(roof, roofMarkup, height), ...dome];
  }

  function landmarkBuildingClass(name) {
    if (!LANDMARK_BY_NAME.has(name)) return "";
    return ` landmark ${LANDMARK_BY_NAME.get(name).kind}`;
  }

  const HIPPED_ROOF_BUILDINGS = new Set([
    274995725,274995731,274995733,274995734,274995737,274995755,
    274995760,274995765,274995779,274995789,
  ]);

  function campusMeters(lat,lng) {
    const east = (lng-COLLEGE_WALK_ORIGIN[1])*111320*Math.cos(COLLEGE_WALK_ORIGIN[0]*Math.PI/180);
    const north = (lat-COLLEGE_WALK_ORIGIN[0])*110540;
    return [.875*east-.484*north,.484*east+.875*north];
  }

  function hippedRoof(project, poly, height) {
    const grid = poly.map(([lat,lng]) => campusMeters(lat,lng));
    const xs = grid.map(([x])=>x), ys = grid.map(([,y])=>y);
    const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
    let w=(Math.max(...xs)-Math.min(...xs))/2-.45, d=(Math.max(...ys)-Math.min(...ys))/2-.45;
    const corners = () => [[cx-w,cy-d],[cx+w,cy-d],[cx+w,cy+d],[cx-w,cy+d]];
    const fits = () => corners().every(([x,y],index,ring) => {
      const [nx,ny]=ring[(index+1)%ring.length];
      return Array.from({length:9},(_,step)=>step/8).every((t)=>{
        const p=campusOffset(x+(nx-x)*t,y+(ny-y)*t);
        return pointInPolygon(p.lat,p.lon,poly);
      });
    });
    for(let attempt=0;attempt<7 && !fits();attempt+=1) { w-=.65;d-=.65; }
    if(Math.min(w,d)<3 || !fits()) return null;
    const rise=Math.min(3.1,Math.min(w,d)*.29);
    const vertex=([east,north],z)=>{
      const {lat,lon}=campusOffset(east,north);
      return [...project(lat,lon,z),z];
    };
    const eave=corners().map((point)=>vertex(point,height-rise));
    const ridgeHalf=Math.max(.2,Math.abs(w-d));
    const ridge=(w>=d ? [[cx-ridgeHalf,cy],[cx+ridgeHalf,cy]] : [[cx,cy-ridgeHalf],[cx,cy+ridgeHalf]])
      .map((point)=>vertex(point,height));
    const [a,b,c,dCorner]=eave;
    const [p,q]=ridge;
    const facets=w>=d ? [[a,b,q,p],[b,c,q],[c,dCorner,p,q],[dCorner,a,p]]
      : [[a,b,p],[b,c,q,p],[c,dCorner,q],[dCorner,a,p,q]];
    const fills=["#c4d6cf","#a9c1ba","#b6cec5","#d2dfd8"];
    return {rise, faces:facets.map((points,index)=>surface(points,
      `<polygon points="${pointsAttr(points)}" fill="${fills[index]}" stroke="#819c93" stroke-width=".48"/>`))};
  }

  function drawBuilding(project, building, selectedName, onCampus) {
    if (!building.poly || building.poly.length < 4) return null;
    const center = polygonCentroid(building.poly);
    if (!inBounds(center[0], center[1])) return null;
    const height = clamp(Number(building.height) || (Number(building.levels) || 3) * 3.3, 5, 90);
    const landmark = LANDMARK_BY_NAME.has(building.name);
    const selected = building.name === selectedName;
    const brick = onCampus && !/^(Low Memorial Library|Butler Library|Uris Hall|Northwest Corner Building)$/.test(building.name);
    const className = `campus-block ${landmark ? "landmark" + landmarkBuildingClass(building.name) : onCampus ? "academic" : "context"}${brick ? " campus-brick" : ""}${selected ? " selected" : ""}`;
    const walls = DOME_BUILDINGS.test(building.name || "") ? height * 0.70 : height;
    let faces;
    if (building.id === 274995764) {
      const roofBox=(west,south,east,north)=>({
        poly:[[west,south],[east,south],[east,north],[west,north]].map(([x,y])=>{
          const {lat,lon}=campusOffset(x,y);
          return [lat,lon];
        }),
      });
      const shell=className+" northwest";
      const towerTop=height-3.15;
      const outline={...building,poly:building.poly.filter((_,index)=>![3,10].includes(index))};
      faces=[
        ...extrudePrism(project,outline,center,towerTop,shell,landmark,false),
        ...extrudePrism(project,roofBox(-159,249,-145,294),center,height-1.25,shell+" northwest-rooftop",landmark,false,towerTop),
        ...[255,266,278,289].flatMap((y)=>extrudePrism(
          project,roofBox(-157,y-2,-150,y+2),center,height,shell+" northwest-rooftop",landmark,false,height-1.25,
        )),
      ];
    } else if (building.id === 274995776) {
      const box = (west,south,east,north,levels=0) => ({
        levels,
        poly:[[west,south],[east,south],[east,north],[west,north]].map(([x,y])=>{
          const {lat,lon}=campusOffset(x,y);
          return [lat,lon];
        }),
      });
      const base=height*.36;
      const towerTop=height*.88;
      const screenTop=height*.965;
      const shell=className+" uris";
      faces=[
        ...extrudePrism(project,{...building,levels:4},center,base,shell,landmark,false),
        ...extrudePrism(project,box(-71,187,-15,209),center,towerTop,shell+" uris-tower",landmark,false,base),
        ...extrudePrism(project,box(-67,192,-19,206),center,screenTop,shell+" uris-equipment",landmark,false,towerTop),
        ...[-62,-54,-42,-34,-25].flatMap((x)=>extrudePrism(
          project,box(x-2.6,197,x+2.6,202),center,height,shell+" uris-equipment",landmark,false,screenTop,
        )),
      ];
    } else if (building.id === 274995757) {
      const lower = { ...building, poly: building.poly.filter((_,index) => index !== 13) };
      const rotunda = {
        poly: [[-62,84],[-25,84],[-25,122],[-62,122]].map(([east,north]) => {
          const {lat,lon} = campusOffset(east,north);
          return [lat,lon];
        }),
      };
      const rotundaCenter = polygonCentroid(rotunda.poly);
      const baseHeight = height*.63;
      const domeBase = height*.78;
      faces = [
        ...extrudePrism(project,lower,center,baseHeight,className,landmark,false),
        ...extrudePrism(project,rotunda,rotundaCenter,domeBase,className+" low-rotunda",landmark,false,baseHeight),
        ...drawDome(project,rotundaCenter,rotunda.poly,domeBase,height-domeBase,true),
      ];
    } else if (building.id === 274995721) {
      // Join the two nearly collinear segments behind the main colonnade.
      const lower = { ...building, poly: building.poly.filter((_, index) => index !== 2) };
      const baseHeight = height * .74;
      const upper = {
        name: building.name,
        levels: 2,
        poly: [[-74,-108],[-14,-108],[-14,-151],[-74,-151]]
          .map(([east,north]) => {
            const {lat,lon} = campusOffset(east,north);
            return [lat,lon];
          }),
      };
      faces = [
        ...extrudePrism(project,lower,center,baseHeight,className,landmark,false),
        ...extrudePrism(project,upper,center,height-.75,className + " butler-upper",landmark,false,baseHeight),
        ...butlerRoof(project,height),
      ];
    } else {
      const roof = HIPPED_ROOF_BUILDINGS.has(building.id) ? hippedRoof(project,building.poly,walls) : null;
      faces = roof ? [
        ...extrudePrism(project,building,center,walls-roof.rise,className,landmark,brick),
        ...roof.faces,
      ] : extrudePrism(project, building, center, walls, className, landmark, brick);
    }
    const nodePoint = project(center[0], center[1], height + 1);
    const node = `<circle class="campus-building-node ${landmark ? "landmark" : ""}" data-building-node="${escapeXml(building.name || "")}" cx="${nodePoint[0].toFixed(1)}" cy="${nodePoint[1].toFixed(1)}" r="${landmark ? 3 : 2.2}"><title>${escapeXml(building.name || "University building")}</title></circle>`;
    return {name: building.name, faces, node};
  }

  function gatePosition(name, across = 0, depth = 0) {
    return campusOffset((name === "Broadway Gate" ? -166 : 78) + depth, across);
  }

  // Cross-sections are horizontal rings in local east/north coordinates.
  function monumentMesh(place, rings, palette) {
    const faces=[];
    const count=rings[0].length;
    const points=rings.map((ring)=>ring.map((p)=>place(...p)));
    const outline=points[0];
    const winding=outline.reduce((sum,a,index)=>{
      const b=outline[(index+1)%count];
      return sum+a[0]*b[1]-b[0]*a[1];
    },0);
    const face=(vertices,fill,top)=>surface(vertices,
      `<polygon points="${pointsAttr(vertices)}" fill="${fill}" stroke="${palette[3]}" stroke-width=".24" stroke-linejoin="round"/>`,top);
    for(let level=0;level<points.length-1;level+=1) {
      for(let index=0;index<count;index+=1) {
        const next=(index+1)%count;
        const a=points[level][index],b=points[level][next];
        const c=points[level+1][next],d=points[level+1][index];
        // Split each panel into triangles so leaned limbs retain exact depth planes.
        for(const vertices of [[a,b,c],[a,c,d]]) {
          const [p,q,r]=vertices;
          const area=(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
          if(area*winding<=0 || Math.abs(area)<.0001) continue;
          faces.push(face(vertices,palette[Math.floor(index*2/count)]));
        }
      }
    }
    const cap=points.at(-1);
    faces.push(face(cap,palette[2],cap[0][2]));
    return faces;
  }

  function monumentBox(place,x,y,width,depth,bottom,top,palette) {
    const ring=(z)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[x+a*width/2,y+b*depth/2,z]);
    return monumentMesh(place,[ring(bottom),ring(top)],palette);
  }

  const LOCATION_PIN_PATH = "M0 0C-3-4-11-12-11-19a11 11 0 0 1 22 0C11-12 3-4 0 0Z";

  function drawSubwayEntrance(project) {
    // Campus-side sidewalk, north of the Broadway Gate.
    const point=(east,north,z=0)=>{
      const {lat,lon}=campusOffset(-170+east,17+north);
      return project(lat,lon,z);
    };
    const footprint=[point(-1.25,-4),point(1.25,-4),point(1.25,4),point(-1.25,4)];
    const stairTreads=Array.from({length:10},(_,index)=>{
      const north=-3.7+index*.75;
      return `<polyline points="${pointsAttr([point(-1.12,north),point(1.12,north)])}"/>`;
    }).join("");
    const rails=[-1.3,1.3].map((east)=>{
      const ribs=[-3.9,-2,-.1,1.8,3.9].map((north)=>
        `<polyline points="${pointsAttr([point(east,north),point(east,north,1.12)])}"/>`
      ).join("");
      return ribs+`<polyline points="${pointsAttr([point(east,-4,1.12),point(east,4,1.12)])}"/>`;
    }).join("");
    const posts=[-1.34,1.34].map((east)=>{
      const top=point(east,-4,2);
      return `<polyline points="${pointsAttr([point(east,-4),top])}" stroke="#28463b" stroke-width="1"/>
        <circle cx="${top[0]}" cy="${top[1]}" r="1.18" fill="#a2bb85" stroke="#28463b" stroke-width=".4"/>`;
    }).join("");
    const [x,y]=point(0,-2);
    return `<g role="img" aria-label="116th Street–Columbia University subway entrance, line 1">
      <title>116 St–Columbia University · 1 subway entrance</title>
      <polygon points="${pointsAttr(footprint)}" fill="#515651" stroke="#29352e" stroke-width=".65"/>
      <g fill="none" stroke="#abae9f" stroke-width=".42">${stairTreads}</g>
      <g fill="none" stroke="#28463b" stroke-width=".88">${rails}</g>
      ${posts}
      <g class="campus-course-cursor" style="--course-pin-color:#242522" transform="translate(${x} ${y})">
        <path class="course-cursor-pin" d="${LOCATION_PIN_PATH}"/>
        <circle cy="-19" r="5.6" fill="#c93536"/>
        <text class="course-cursor-label" y="-19" text-anchor="middle" dominant-baseline="central">1</text>
        <rect class="course-cursor-label-bg" x="-27" y="-51" width="54" height="16" rx="4"/>
        <text class="course-cursor-label" y="-40" text-anchor="middle">Subway</text>
      </g>
    </g>`;
  }

  function drawGate(projectLevel, landmark, selectedName) {
    const broadway=landmark.name==="Broadway Gate";
    const anchor=gatePosition(landmark.name);
    const base=campusElevation(anchor.lat,anchor.lon);
    const place=(depth,across,z)=>{
      const {lat,lon}=gatePosition(landmark.name,across,depth);
      return [...projectLevel(lat,lon,base+z),base+z];
    };
    const stone=["#c5b9a5","#e0d5c0","#eee5d4","#756958"];
    const span=broadway?6.4:5.6;
    const wings=broadway?11.7:10.5;
    const faces=[];
    for(const [start,end,height] of [[-wings,-span,2.1],[-span,span,3.1],[span,wings,2.1]]) {
      const crown=(x)=>height+(height>3?.65*(1-(x/span)**2):0);
      const rail=(vertices)=>`<polyline points="${pointsAttr(vertices)}"/>`;
      const bars=Math.ceil((end-start)/.46);
      const pickets=Array.from({length:bars+1},(_,index)=>{
        const x=start+(end-start)*index/bars;
        return rail([place(0,x,.16),place(0,x,crown(x))]);
      });
      for(const z of [.5,1.05]) pickets.push(rail([place(0,start,z),place(0,end,z)]));
      pickets.push(rail(Array.from({length:9},(_,i)=>{
        const x=start+(end-start)*i/8;
        return place(0,x,crown(x)-.23);
      })));
      const plane=[place(0,start,0),place(0,end,0),place(0,end,height+.66),place(0,start,height+.66)];
      if(Math.abs(plane[0][0]-plane[1][0])>.001) {
        faces.push({...surface(plane,`<g fill="none" stroke="#343b36" stroke-width=".8">${pickets.join("")}</g>`),occludes:false});
      }
    }
    for(const [across,width,height] of [[-wings,.8,2.65],[wings,.8,2.65],[-span,1.65,broadway?5.4:4.75],[span,1.65,broadway?5.4:4.75]]) {
      faces.push(...monumentBox(place,0,across,width+.16,width+.16,0,.38,stone));
      faces.push(...monumentBox(place,0,across,width,width,.38,height-.29,stone));
      faces.push(...monumentBox(place,0,across,width+.29,width+.29,height-.29,height,stone));
    }
    return {landmark:landmark.name,selected:landmark.name===selectedName,faces};
  }

  function drawAlmaMater(projectLevel, landmark, selectedName) {
    const elevation=campusElevation(landmark.lat,landmark.lng);
    const scale=1.25;
    const place=(east,north,z)=>{
      const [lat,lng]=offsetGeo(landmark.lat,landmark.lng,scale*(.875*east+.484*north),scale*(-.484*east+.875*north));
      return [...projectLevel(lat,lng,elevation+z*scale),elevation+z*scale];
    };
    const stone=["#b6ad9e","#d1c8b7","#e4ddce","#827b6e"];
    const marble=["#555252","#77716d","#8c837d","#484541"];
    const bronze=["#424b44","#657068","#768074","#353e38"];
    const lit=["#545c51","#70786a","#8a8c78","#42483e"];
    const faces=[];
    const box=(x,y,w,d,b,t,palette)=>faces.push(...monumentBox(place,x,y,w,d,b,t,palette));
    const form=(sections,palette=bronze)=>{
      const rings=sections.map(([x,y,z,rx,ry])=>Array.from({length:8},(_,i)=>{
        const angle=i*Math.PI/4;
        return [x+rx*Math.cos(angle),y+ry*Math.sin(angle),z];
      }));
      faces.push(...monumentMesh(place,rings,palette));
    };
    box(0,0,2.65,1.92,0,.20,stone);
    box(0,0,2.20,1.58,.20,1.20,stone);
    box(0,0,2.34,1.70,1.20,1.46,marble);
    box(0,.08,1.32,.94,1.46,1.88,bronze);
    box(0,.46,1.25,.19,1.86,2.78,bronze);
    for(const x of [-.66,.66]) box(x,.01,.14,.91,1.82,2.47,lit);
    // Robe pools at the feet, bends over the knees, then tapers at the waist.
    form([[0,-.29,1.47,.51,.40],[0,-.36,1.83,.57,.49],[0,-.30,2.11,.56,.48],[0,.02,2.40,.38,.33]]);
    form([[0,.02,2.32,.34,.29],[0,.06,2.64,.36,.28],[0,.08,2.92,.48,.27],[0,.08,3.06,.28,.21]]);
    form([[0,.08,3.02,.15,.15],[0,.06,3.24,.16,.16],[0,.04,3.43,.24,.22],[0,.08,3.64,.20,.20],[0,.10,3.73,.11,.12]],lit);
    form([[-.77,-.09,2.53,.12,.14],[-.59,-.01,2.73,.14,.15],[-.40,.07,2.98,.17,.18]]);
    form([[-.76,-.09,2.56,.13,.14],[-.91,-.13,2.88,.10,.10],[-1.01,-.14,3.18,.10,.09]],lit);
    form([[.76,-.04,2.51,.13,.14],[.56,.02,2.77,.16,.16],[.38,.08,2.98,.17,.18]]);
    form([[.75,-.04,2.57,.12,.13],[.94,-.10,2.79,.10,.10],[1.10,-.14,2.94,.115,.09]],lit);
    form([[-1.01,-.14,2.90,.047,.047],[-1.01,-.14,4.07,.045,.045]],lit);
    form([[-1.01,-.14,4.07,.083,.083],[-1.01,-.14,4.18,.047,.047]],lit);
    box(.08,-.44,.66,.42,2.06,2.13,lit);
    return {landmark:landmark.name,selected:landmark.name===selectedName,faces};
  }

  function drawCoursePointers(project, centralBuildings) {
    const targets = window.CAMPUS_MODEL_COURSE_TARGETS || [];
    return targets.map((target, index) => {
      const alias = normalizeBuildingName(target.name);
      let match = centralBuildings.find((entry) => {
        const candidate = normalizeBuildingName(entry.building.name);
        return candidate === alias || candidate.includes(alias) || alias.includes(candidate);
      });
      if (!match) {
        let distance = Infinity;
        for (const entry of centralBuildings) {
          const current = geoDistanceMeters(target.lat, target.lng, entry.center[0], entry.center[1]);
          if (current < distance) {
            distance = current;
            match = entry;
          }
        }
        if (distance > 90) match = null;
      }
      const offCampus = !match;
      const lat = match?.center[0] ?? clamp(target.lat, BOUNDS.south + 0.0001, BOUNDS.north - 0.0001);
      const lng = match?.center[1] ?? clamp(target.lng, BOUNDS.west + 0.0001, BOUNDS.east - 0.0001);
      const height = offCampus ? 8 : (Number(match?.building.height) || 20);
      const top = project(lat, lng, height + 1);
      const label = (target.codes || []).slice(0, 2).join(" · ") || "Selected course";
      const width = Math.max(54, label.length * 6.4 + 14);
      return `<g class="campus-course-cursor ${offCampus ? "off-campus" : ""}" transform="translate(${top[0]} ${top[1]})" data-course-cursor="${index}">
        <title>${escapeXml(label)} · ${escapeXml(target.name)}</title>
        <path class="course-cursor-pin" d="${LOCATION_PIN_PATH}"/>
        <circle cx="0" cy="-19" r="3.7" fill="#fff"/>
        <rect class="course-cursor-label-bg" x="${-width/2}" y="-51" width="${width}" height="16" rx="4"/>
        <text class="course-cursor-label" y="-40" text-anchor="middle">${escapeXml(label)}</text>
        ${offCampus ? `<text class="course-cursor-destination" y="14" text-anchor="middle">↑ ${escapeXml(target.name)}</text>` : ""}
      </g>`;

    }).join("");
  }

  function lowLibraryTerrace(project) {
    const solid = (west,east,south,north,bottom,top,capColor="#ddd3c2") => {
      const outline = [[west,south],[east,south],[east,north],[west,north]];
      const vertex = ([x,y],z) => {
        const {lat,lon}=campusOffset(x,y);
        return [...project(lat,lon,z),z];
      };
      const base = outline.map((p)=>vertex(p,bottom));
      const cap = outline.map((p)=>vertex(p,top));
      const signedArea = base.reduce((area,a,i)=>{
        const b=base[(i+1)%base.length];
        return area+a[0]*b[1]-b[0]*a[1];
      },0);
      const faces = [surface(cap,`<polygon points="${pointsAttr(cap)}" fill="${capColor}" stroke="#9c907e" stroke-width=".66"/>`,top)];
      for (const [i,a] of base.entries()) {
        const j=(i+1)%base.length;
        const b=base[j];
        if ((b[0]-a[0])*signedArea>=0) continue;
        const corners=[a,b,cap[j],cap[i]];
        const [from,to]=[outline[i],outline[j]];
        const at=(t,z)=>vertex([from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t],z);
        const joints=[];
        const columns=Math.max(1,Math.round(Math.hypot(to[0]-from[0],to[1]-from[1])/3.3));
        const rows=Math.ceil((top-bottom)/1.1);
        for(let row=0;row<rows;row+=1) {
          const z1=bottom+(top-bottom)*row/rows;
          const z2=bottom+(top-bottom)*(row+1)/rows;
          joints.push([at(0,z2),at(1,z2)]);
          for(let col=1;col<columns;col+=1) {
            const t=(col-(row%2)*.5)/columns;
            joints.push([at(t,z1),at(t,z2)]);
          }
        }
        const face = `<polygon points="${pointsAttr(corners)}" fill="${i%2 ? "#bfb09c" : "#b0a08c"}" stroke="#8c7d6a" stroke-width=".65"/>
          <g fill="none" stroke="#8e806c" stroke-width=".42" opacity=".64">${joints.map((line)=>`<polyline points="${pointsAttr(line)}"/>`).join("")}</g>
          <polygon points="${pointsAttr([at(0,top-.38),at(1,top-.38),at(1,top),at(0,top)])}" fill="#cec0ac"/>`;
        faces.push(surface(corners,face));
      }
      return faces;
    };
    const garden = (west,east) => {
      const south=25, north=49, floor=3.43, upper=5.8;
      const stairWest=(west+east)/2-2.6;
      const stairEast=stairWest+5.2;
      const beds=[...solid(west,east,south,north,3.39,floor,"#839674")];
      for(const y of [32.5,39.5]) beds.push(...solid(west+.6,east-.6,y,y+1.05,floor,floor+.035,"#e0d2b8"));
      const axis=(west+east)/2;
      beds.push(...solid(axis-.52,axis+.52,south,north,floor,floor+.036,"#e0d2b8"));
      beds.push(...solid(west-.7,east+.7,51.4,55.3,3.4,upper,"#b08773"));
      beds.push(...solid(west-.72,west+.24,25,51.4,3.4,upper));
      beds.push(...solid(east-.24,east+.72,25,51.4,3.4,upper));
      beds.push(...solid(west,stairWest,49,51.4,3.4,upper));
      beds.push(...solid(stairEast,east,49,51.4,3.4,upper));
      for(let i=0;i<12;i+=1) {
        const a=45+i*6.4/12;
        const b=45+(i+1)*6.4/12;
        const level=3.44+(upper-3.44)*(i+1)/12;
        beds.push(...solid(stairWest,stairEast,a,b,3.44,level,"#e5dbc9"));
      }
      for(const x of [west,east]) beds.push(...solid(x-.62,x+.62,south-.55,south+.65,3.4,upper+.24,"#e6dbc7"));
      return beds;
    };
    return [
      ...garden(-85,-66),
      ...garden(-22,-3),
      ...solid(-78,-62,56,74,3.4,7.6),
      ...solid(-25,-10,56,74,3.4,7.6),
      ...solid(-62,-25,72,74,6.9,7.6),
      ...solid(-87,-84,12,22,0,3.4),
      ...solid(-4,-1,12,22,0,3.4),
    ];
  }

  function campusTrees(project, buildings) {
    const positions = [
      ...[-153,-136,-119,-102,-84,-67,-20,-3,15,33,51,66].map((east)=>[east,9]),
      ...[-153,-137,-121,-104,-89,-69,-19,-2,16,34,51,65].map((east)=>[east,-9]),
      [-72,48],[-78,57],[-73,67],[-16,50],[-12,60],[-11,72],
      [-97,76],[-108,59],[-94,117],[-82,130],[-2,125],[4,107],
      [-94,-44],[-93,-67],[-91,-87],[2,-47],[3,-71],[4,-91],
    ];
    return positions.flatMap(([east,north],index)=>{
      const {lat,lon}=campusOffset(east,north);
      if(buildings.some(({building})=>pointInPolygon(lat,lon,building.poly))) return [];
      const radius=2.4+(index*7%6)*.24;
      const height=6+(index*13%5)*.52;
      const point=(fraction,angle,z)=>{
        const p=campusOffset(east+fraction*radius*Math.cos(angle),north+fraction*radius*Math.sin(angle));
        return [...project(p.lat,p.lon,z),z+campusElevation(p.lat,p.lon)];
      };
      const ring=Array.from({length:8},(_,i)=>point(.92+(i*11+index)%4*.06,i*Math.PI/4,height*.68));
      const top=point(.15,index,height);
      const palette=["#788b66","#87986c","#6a815d","#9ba879"];
      const faces=ring.map((p,i)=>{
        const vertices=[p,ring[(i+1)%ring.length],top];
        return surface(vertices,`<polygon points="${pointsAttr(vertices)}" fill="${palette[(i+index)%4]}" stroke="#6e825f" stroke-width=".24"/>`);
      });
      const shadow=ring.map((_,i)=>point(.9,i*Math.PI/4,0));
      const [baseX,baseY]=project(lat,lon);
      const [trunkX,trunkY]=project(lat,lon,height*.68);
      const trunk=`<polygon points="${pointsAttr(shadow)}" fill="#697957" opacity=".16"/>
        <path d="M${baseX} ${baseY}L${trunkX} ${trunkY}" stroke="#796c52" stroke-width=".72"/>`;
      return [{faces,trunk}];
    });
  }

  function renderCampusModel(selectedName = MODEL_STATE.selected) {
    const host = document.querySelector("#campus-model-svg");
    const loading = document.querySelector("#map-loading");
    if (!host) return;
    const buildings = window.CAMPUS_3D?.buildings || [];
    const osm = window.CAMPUS_OSM?.elements || [];
    if (!buildings.length || !osm.length) {
      if (loading) loading.textContent = "Campus geometry is unavailable.";
      return;
    }
    MODEL_STATE.selected = selectedName || "";
    MODEL_STATE.built = true;
    const projectLevel = makeProjection(MODEL_STATE.rotation, MODEL_STATE.pitch);
    const project = (lat,lng,z=0)=>projectLevel(lat,lng,z+campusElevation(lat,lng));
    const mainCampus = CAMPUS_RECT.map(([east,north]) => campusOffset(east,north));
    const isMainCampus = (lat,lon) => pointInPolygon(lat,lon,mainCampus);
    const greenWays = osm.filter((item) => item.type === "way"
      && item.geometry?.length > 3
      && (item.tags?.landuse === "grass"
        || item.tags?.landuse === "recreation_ground"
        || item.tags?.landuse === "village_green"
        || item.tags?.leisure === "park"
        || item.tags?.leisure === "garden"
        || item.tags?.leisure === "pitch"
        || item.tags?.natural === "grass"
        || item.tags?.surface === "grass"));
    const nearbyStreets = CAMPUS_STREET_RECT.map(([east,north]) => campusOffset(east,north));
    const streetTypes = new Set(["primary", "secondary", "tertiary", "residential"]);
    const roadWays = osm.filter((item) => {
      if (item.type !== "way" || !(item.geometry?.length > 1)) return false;
      const highway = item.tags?.highway;
      const name = item.tags?.name || "";
      if (streetTypes.has(highway)) {
        return /Broadway|Amsterdam Avenue|West 11[4-9]th Street|West 120th Street/.test(name)
          && item.geometry.some(({lat,lon}) => pointInPolygon(lat,lon,nearbyStreets));
      }
      if (!["footway", "pedestrian", "steps", "path", "crossing"].includes(highway)) return false;
      if (/College Walk|Low Library Steps|Reunion Plaza|Revson Plaza/i.test(name)) return true;
      return item.geometry.some(({lat, lon}) => inBounds(lat, lon)
        && isMainCampus(lat,lon))
        && (item.tags.footway !== "sidewalk")
        && geometryLengthMeters(item.geometry) >= (highway === "steps" ? 2 : 4);
    });
    const campusNames = new Set(
      (window.BUILDINGS || []).filter((building) => building.campus === "Morningside").map((building) => normalizeBuildingName(building.name)),
    );
    const footprintById = new Map(buildings.map((building) => [building.id, building]));
    const groundHeight = (id, fallback) => {
      if (id === DIANA_CENTER_ID) return 26;
      if (id === 274995776) return 40.35; // NYC Building Footprints, BIN 1084473.
      return CITY_ROOF_HEIGHTS[id] || fallback;
    };
    const osmBuildings = osm
      .filter((item) => item.type === "way" && item.tags?.building && item.geometry?.length > 3)
      .map((item) => {
        const poly = CITY_FOOTPRINTS[item.id] || item.geometry.map((point) => [point.lat, point.lon]);
        const center = polygonCentroid(poly);
        const name = item.tags.name || "University building";
        const buildingType = item.tags.building;
        const explicitHeight = Number.parseFloat(item.tags.height || "");
        const levelHeight = Number.parseFloat(item.tags["building:levels"] || "") * 3.25;
        return { item, building: {
          id: item.id,
          name,
          levels: item.id === DIANA_CENTER_ID ? 7 : item.id === 738973812 ? 15 : item.tags["building:levels"],
          height: groundHeight(item.id, explicitHeight || levelHeight || footprintById.get(item.id)?.height
            || (buildingType === "university" ? 20 : buildingType === "dormitory" ? 28 : buildingType === "roof" ? 5 : 16)),
          poly,
        }, center };
      })
      .filter((entry) => inBounds(entry.center[0], entry.center[1]))
      .filter((entry) => {
        const type = entry.item.tags.building;
        return isMainCampus(...entry.center)
          || campusNames.has(normalizeBuildingName(entry.building.name))
          || ["university", "dormitory", "college"].includes(type);
      });
    const coveredIds = new Set(osmBuildings.map(({building}) => building.id));
    const coveredNames = new Set(osmBuildings.map(({building}) => normalizeBuildingName(building.name)));
    const extraNamedFootprints = buildings
      .filter((building) => building.name && building.poly?.length > 3)
      .filter((building) => {
        const normalized = normalizeBuildingName(building.name);
        return LANDMARK_BY_NAME.has(building.name)
          || campusNames.has(normalized)
          || [...campusNames].some((name) => name && (normalized.includes(name) || name.includes(normalized)));
      })
      .filter((building) => !coveredIds.has(building.id) && !coveredNames.has(normalizeBuildingName(building.name)))
      .map((building) => ({
        building: { ...building, height: groundHeight(building.id, building.height) },
        center: polygonCentroid(building.poly),
      }));
    const centralBuildings = [
      ...osmBuildings,
      ...extraNamedFootprints,
      { building: HAMILTON_HALL, center: polygonCentroid(HAMILTON_HALL.poly) },
    ]
      .map((entry) => ({ ...entry, depth: project(entry.center[0], entry.center[1], 0)[1] }))
      .sort((a, b) => a.depth - b.depth);
    const defs = `<defs>
      <style>
        .campus-block.campus-brick.campus-block-side-a { fill: #795750; stroke: #674137; stroke-width: .58; }
        .campus-block.campus-brick.campus-block-side-b { fill: #966d60; stroke: #674137; stroke-width: .58; }
        .campus-block.campus-brick.campus-block-roof { fill: #b5cbc6; stroke: #72918b; stroke-width: .76; }
        .campus-block.campus-brick.pupin.campus-block-side-a,
        .campus-block.campus-brick.pupin.campus-block-side-b { stroke-width: .42; }
        .campus-roof-rim { fill: none; stroke: #d8e3df; stroke-width: .45; stroke-opacity: .82; pointer-events: none; }
        .campus-block.campus-brick.selected.campus-block-roof { fill: #c4d8d3; stroke: #644a31; stroke-width: 1.55; }
        .campus-block.northwest.campus-block-side-a { fill:#a5aba5; stroke:#667570; stroke-width:.68; }
        .campus-block.northwest.campus-block-side-b { fill:#c2c3b9; stroke:#667570; stroke-width:.68; }
        .campus-block.northwest.campus-block-roof { fill:#aeb7ad; stroke:#74847c; stroke-width:.7; }
        .campus-block.northwest-rooftop.campus-block-roof { fill:#c4cbc0; }
        .campus-block.uris.campus-block-side-a { fill:#a1a8a5; stroke:#697574; stroke-width:.65; }
        .campus-block.uris.campus-block-side-b { fill:#bcc1b9; stroke:#697574; stroke-width:.65; }
        .campus-block.uris.campus-block-roof { fill:#969b94; stroke:#65736f; stroke-width:.75; }
        .campus-block.uris-tower.campus-block-roof { fill:#7d8988; }
        .campus-block.uris-equipment.campus-block-side-a,
        .campus-block.uris-equipment.campus-block-side-b { fill:#788989; stroke-width:.44; }
        .campus-block.uris-equipment.campus-block-roof { fill:#adb4ad; }
        .campus-block.low.campus-block-side-a { fill: #c9c1b3; stroke: #827b6f; stroke-width: .65; }
        .campus-block.low.campus-block-side-b { fill: #ded6c8; stroke: #827b6f; stroke-width: .65; }
        .campus-block.low.campus-block-roof { fill: #e4ded2; stroke: #8d8679; stroke-width: .7; }
        .campus-block.low.low-rotunda.campus-block-roof { fill: #d6cfc1; }
        .campus-block.butler.campus-block-side-a { fill: #b8aa93; stroke: #786c5b; stroke-width: .65; }
        .campus-block.butler.campus-block-side-b { fill: #d1c3a9; stroke: #786c5b; stroke-width: .65; }
        .campus-block.butler.campus-block-roof { fill: #dbd2bf; stroke: #847865; stroke-width: .7; }
        .campus-block.butler.butler-upper.campus-block-roof { fill: #b5cbc6; stroke: #72918b; }
      </style>
      <filter id="campus-model-shadow" x="-20%" y="-30%" width="150%" height="170%">
        <feDropShadow dx="0" dy="13" stdDeviation="12" flood-color="#222" flood-opacity=".10"/>
      </filter>
      <pattern id="campus-paper-grid" width="22" height="22" patternUnits="userSpaceOnUse">
        <path d="M22 0H0V22" fill="none" stroke="#232321" stroke-opacity=".045" stroke-width=".7"/>
      </pattern>
      <pattern id="campus-grass-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width="9" height="9" fill="#cbd9bc"/>
        <circle cx="2" cy="2" r=".55" fill="#8ea17c" opacity=".45"/><circle cx="6" cy="6" r=".38" fill="#f2f5ec"/>
      </pattern>
    </defs>`;

    const campusPaving = [
      // College Walk, between mapped north and south edge paths.
      [[-168,-11.5],[79,-11.5],[79,11.5],[-168,11.5]],
      // Low Plaza and the central forecourt at the foot of the library.
      [[-86,12],[0,12],[0,32],[-86,32]],
      [[-63,32],[-25,32],[-25,71],[-63,71]],
      // The Sundial axis leads past the twin fields to Butler Library.
      [[-53,-11],[-36,-11],[-36,-106],[-53,-106]],
      [[-91,-103],[5,-103],[5,-96],[-91,-96]],
    ];
    const tile = (west,south,east,north) => campusArea(project,[[west,south],[east,south],[east,north],[west,north]]);
    const brickBorders = [[-166,-10.8,78,-8],[-166,8,78,10.8],[-86,12,0,14],[-83,29,-4,31]]
      .map((bounds)=>`<path d="${tile(...bounds)}" fill="#ad7967" opacity=".82"/>`).join("");
    const plazaTiles = Array.from({length:18},(_,index)=>{
      const x=-64+(index%6)*6.6,y=24+Math.floor(index/6)*5.35;
      return `<path d="${tile(x,y,x+6.2,y+4.1)}" fill="#ad7967"/>
        <path d="${tile(x+1,y+.7,x+5.2,y+3.4)}" fill="#e8ddca"/>
        <path d="${tile(x+1.85,y+1.15,x+4.35,y+2.95)}" fill="#bd8e78"/>`;
    }).join("");
    const perimeter = CAMPUS_RECT.flatMap(([east,north],index)=>{
      const [endEast,endNorth]=CAMPUS_RECT[(index+1)%CAMPUS_RECT.length];
      const breaks=LOW_TERRACE_BREAKS.filter((y)=>y>Math.min(north,endNorth)&&y<Math.max(north,endNorth));
      if(endNorth<north) breaks.reverse();
      return [campusOffset(east,north),...breaks.map((y)=>campusOffset(east+(endEast-east)*(y-north)/(endNorth-north),y))];
    });
    const streetPerimeter=perimeter.map(({lat,lon})=>projectLevel(lat,lon));
    const groundPerimeter=perimeter.map(({lat,lon})=>project(lat,lon));
    const winding=streetPerimeter.reduce((sum,a,index)=>{
      const b=streetPerimeter[(index+1)%streetPerimeter.length];
      return sum+a[0]*b[1]-b[0]*a[1];
    },0);
    const cutBanks=streetPerimeter.map((a,index)=>{
      const next=(index+1)%streetPerimeter.length;
      const b=streetPerimeter[next];
      const c=groundPerimeter[next],d=groundPerimeter[index];
      if((b[0]-a[0])*winding>=0 || Math.max(a[1]-d[1],b[1]-c[1])<.1) return "";
      const seam=(level)=>[[a[0],a[1]+(d[1]-a[1])*level],[b[0],b[1]+(c[1]-b[1])*level]];
      return `<polygon points="${pointsAttr([a,b,c,d])}" fill="#aa9d87" stroke="#847866" stroke-width=".65"/>
        <g fill="none" stroke="#c0b39d" stroke-width=".55">${[.26,.5,.75].map((level)=>
          `<polyline points="${pointsAttr(seam(level))}"/>`).join("")}</g>`;
    }).join("");
    const plate = `${cutBanks}<path d="${campusArea(project,CAMPUS_RECT)}" fill="#f2eee5" stroke="#c9c0af" stroke-width="1" />
      <g fill="#e3dac8" stroke="#cdc0a8" stroke-width=".65">
        ${campusPaving.map((corners) => `<path d="${campusArea(project,corners)}"/>`).join("")}
      </g>`;

    const greenMarkup = greenWays.map((way) => {
      const center = polygonCentroid(way.geometry.map((point) => [point.lat, point.lon]));
      if (!inBounds(center[0], center[1], 0.00008)) return "";
      const insideCampus = isMainCampus(...center);
      if (!insideCampus && way.tags?.landuse !== "grass" && way.tags?.natural !== "grass") return "";
      return `<path class="campus-green-area" style="stroke:#80906d;stroke-width:.65" d="${polygonPath(project, way.geometry)}"><title>${escapeXml(way.id === 49432231 ? "South Field West" : way.id === 49432232 ? "South Field East" : way.tags.name || "Planting bed")}</title></path>`;
    }).join("");

    const streets = [];
    const walks = [];
    const plazas = [];
    const streetWidth = {primary: 12, secondary: 10, tertiary: 8, residential: 7};
    for (const way of roadWays) {
      const {highway, name, area, lanes} = way.tags;
      if (area === "yes") {
        plazas.push(`<path d="${polygonPath(project, way.geometry)}" fill="#ece4d4" stroke="#b6a78b" stroke-width=".75"/>`);
        continue;
      }
      for (const geometry of clipGeometryRuns(way.geometry)) {
        const path = pathForGeometry(project, geometry);
        if (streetTypes.has(highway)) {
          const width = clamp(Number(lanes) * 3.2 || streetWidth[highway], 6, 18);
          streets.push({path, width, major: highway === "primary" || highway === "secondary"});
          continue;
        }
        if (name === "College Walk") continue;
        const main = way.id === 387468096 || way.id === 387468099 || way.id === 387468095;
        const steps = highway === "steps";
        const width = main ? 1 : highway === "pedestrian" ? 3 : 1.15;
        const color = main ? "#9f8f72" : steps ? "#a59377" : "#b7aa95";
        const dash = steps ? ' stroke-dasharray="1 2"' : "";
        walks.push(`<path d="${path}" stroke="${color}" stroke-width="${width}"${dash}/>`);
      }
    }
    const roadMarkup = MODEL_STATE.roads ? `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${streets.map(({path,width}) => `<path d="${path}" stroke="#9b968a" stroke-width="${width + 2}"/>`).join("")}
      ${streets.map(({path,width,major}) => `<path d="${path}" stroke="${major ? "#e4d7bd" : "#ede8df"}" stroke-width="${width}"/>`).join("")}
      ${plazas.join("")}${walks.join("")}
    </g>` : "";

    const stairTreads = [[12,22,18,-84,-4],[56,72,23,-62,-25]].map(([start,end,count,west,eastEdge]) =>
      Array.from({length:count}, (_, index) => {
        const a=start+(end-start)*index/count;
        const b=start+(end-start)*(index+1)/count;
        const place=(east,north,level)=>{
          const p=campusOffset(east,north);
          const anchor=campusOffset(-44,level);
          return projectLevel(p.lat,p.lon,campusElevation(anchor.lat,anchor.lon));
        };
        const tread=[place(west,a,b),place(eastEdge,a,b),place(eastEdge,b,b),place(west,b,b)];
        const riser=[place(west,a,a),place(eastEdge,a,a),tread[1],tread[0]];
        return `<polygon points="${pointsAttr(tread)}" fill="#e1d8c9" stroke="#b9ab98" stroke-width=".36"/>
          <polygon points="${pointsAttr(riser)}" fill="#aa9e8d" stroke="none"/>`;
      }).join("")).join("");
    const trees = campusTrees(project,centralBuildings);
    const monuments = LANDMARKS.filter((item)=>item.kind==="gate" || item.kind==="statue")
      .map((item)=>item.kind==="gate" ? drawGate(projectLevel,item,MODEL_STATE.selected)
        : drawAlmaMater(projectLevel,item,MODEL_STATE.selected));
    const buildingMarkup = renderBuildingSurfaces([
      ...centralBuildings.map(({building,center})=>{
        const base=campusElevation(...center);
        const buildingProject=(lat,lng,z=0)=>projectLevel(lat,lng,z+base);
        const model=drawBuilding(buildingProject,building,MODEL_STATE.selected,isMainCampus(...center));
        // Surface depths must use the same absolute level as their projected vertices.
        model?.faces.forEach((face)=>{face.offset+=base;});
        return model;
      }).filter(Boolean),
      {faces:lowLibraryTerrace(projectLevel)},
      ...trees.map(({faces})=>({faces})),
      ...monuments,
    ]);
    const labels = MODEL_STATE.labels ? LANDMARKS.map((item, landmarkIndex) => {
      const entry = centralBuildings.find(({building}) => building.name === item.name);
      const gate = item.kind === "gate" ? gatePosition(item.name) : null;
      const coordinates = gate ? [gate.lat,gate.lon] : item.lat ? [item.lat,item.lng] : entry?.center;
      if (!coordinates) return "";
      const height = gate ? (item.name === "Broadway Gate" ? 5.4 : 4.75) : entry?.building.height || 5.225;
      const point = project(...coordinates, height);
      const markerY = point[1] - (gate ? 9 : 16);
      return `<g class="campus-model-pin ${item.name === MODEL_STATE.selected ? "active" : ""}" data-campus-landmark="${item.name}">
        <circle class="pin-dot" cx="${point[0]}" cy="${markerY}" r="7"/>
        <text class="campus-pin-number" x="${point[0]}" y="${markerY + 2.5}" text-anchor="middle">${String(landmarkIndex + 1).padStart(2, "0")}</text>
      </g>`;
    }).join("") : "";
    const roadLabels = MODEL_STATE.labels && MODEL_STATE.roads ? [
      ["Broadway", "Broadway"], ["Amsterdam Avenue", "Amsterdam Ave"], ["College Walk", "College Walk"],
    ].map(([name, label]) => {
      const runs = roadWays.filter((way) => way.tags.name === name)
        .flatMap((way) => clipGeometryRuns(way.geometry));
      runs.sort((a, b) => geometryLengthMeters(b) - geometryLengthMeters(a));
      const longest = runs[0];
      if (!longest) return "";
      const index = Math.floor((longest.length - 1) / 2);
      const a = longest[index];
      const b = longest[index + 1];
      const point = project((a.lat + b.lat) / 2, (a.lon + b.lon) / 2, 1);
      return `<text class="campus-model-watermark" x="${point[0]}" y="${point[1] - 7}" text-anchor="middle">${label}</text>`;
    }).join("") : "";

    host.innerHTML = `${defs}
      <rect width="${VIEW.width}" height="${VIEW.height}" fill="url(#campus-paper-grid)" opacity=".55"/>
      <g id="campus-model-camera">
        ${plate}
        <g id="campus-model-ground">${greenMarkup}${brickBorders}${plazaTiles}${trees.map(({trunk})=>trunk).join("")}</g>
        <g id="campus-model-roads">${roadMarkup}<g fill="none" stroke="#a3947b" stroke-width=".68">${MODEL_STATE.roads ? stairTreads : ""}</g></g>
        <g id="campus-model-buildings">${buildingMarkup}</g>
        <g id="campus-model-transit">${drawSubwayEntrance(project)}</g>
        <g id="campus-model-labels">${labels}${roadLabels}</g>
        <g id="campus-model-course-pointers">${drawCoursePointers(project, centralBuildings)}</g>
      </g>`;
    applyCampusCamera();
    if (loading) loading.hidden = true;
    const fallback = document.querySelector("#map-fallback");
    if (fallback) fallback.hidden = true;
    const angleLabel = document.querySelector("#campus-model-angle");
    if (angleLabel) angleLabel.textContent = `AZ ${Math.round(MODEL_STATE.rotation)}° · EL ${Math.round(MODEL_STATE.pitch)}°`;
  }

  function applyCampusCamera() {
    const camera = document.querySelector("#campus-model-camera");
    if (!camera) return;
    const cx = VIEW.centerX;
    const cy = VIEW.centerY;
    camera.setAttribute("transform", `translate(${MODEL_STATE.panX} ${MODEL_STATE.panY}) translate(${cx} ${cy}) scale(${MODEL_STATE.zoom}) translate(${-cx} ${-cy})`);
  }

  function focusCampusModel(name) {
    const alias = String(name || "").trim().toLowerCase();
    const exact = LANDMARKS.find((item) => item.name.toLowerCase() === alias || item.label.toLowerCase() === alias);
    const partial = alias && LANDMARKS.find((item) => item.name.toLowerCase().includes(alias) || item.label.toLowerCase().includes(alias));
    const landmark = exact || partial || null;
    const building = alias && [HAMILTON_HALL, ...(window.CAMPUS_3D?.buildings || [])].find((item) => item.name && item.name.toLowerCase().includes(alias));
    const selected = landmark?.name || building?.name || "";
    MODEL_STATE.selected = selected;
    renderCampusModel(selected);
    if (window.updateMapLinks) updateMapLinks(name || "Columbia University");
  }

  function bindCampusModelControls() {
    document.querySelector("#campus-model-viewport")?.addEventListener("click", (event) => {
      const pin = event.target.closest("[data-campus-landmark]");
      if (pin) focusCampusModel(pin.dataset.campusLandmark);
      const buildingNode = event.target.closest("[data-building-node]");
      if (buildingNode?.dataset.buildingNode && !/^University building$/i.test(buildingNode.dataset.buildingNode)) {
        focusCampusModel(buildingNode.dataset.buildingNode);
      }
    });
    document.querySelectorAll("[data-model-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.modelToggle;
        MODEL_STATE[mode] = !MODEL_STATE[mode];
        button.classList.toggle("active", MODEL_STATE[mode]);
        renderCampusModel();
      });
    });
    document.querySelector("[data-model-reset]")?.addEventListener("click", () => {
      MODEL_STATE.selected = "";
      renderCampusModel();
    });
    const svg = document.querySelector("#campus-model-svg");
    const shell = svg?.closest?.(".campus-model-shell");
    if (shell && typeof ResizeObserver !== "undefined") {
      const updateHeight = () => {
        if (!shell.getClientRects().length) return;
        const top = Math.round(shell.getBoundingClientRect().top + window.scrollY);
        shell.style.setProperty("--campus-map-top", `${top}px`);
      };
      const observer = new ResizeObserver(updateHeight);
      observer.observe(shell);
      const header = document.querySelector(".topbar");
      if (header) observer.observe(header);
      window.addEventListener("resize",updateHeight);
      updateHeight();
    }

  }

  window.renderCampusModel = renderCampusModel;
  window.focusCampusModel = focusCampusModel;
  window.updateCampusCourseTargets = (targets = []) => {
    window.CAMPUS_MODEL_COURSE_TARGETS = Array.isArray(targets) ? targets : [];
    if (MODEL_STATE.built) renderCampusModel();
  };
  bindCampusModelControls();
  renderCampusModel();
  window.CAMPUS_MODEL_INITIALIZED = true;
})();
