-- osm2pgsql flex: yalniz POI etiketleri, cikti osm_poi_raw.
-- Alan/iliski geometrileri centroid'e indirgenir (venues_open Point tasir).

local poi = osm2pgsql.define_table({
  name = 'osm_poi_raw',
  ids = { type = 'any', id_column = 'osm_id', type_column = 'osm_type' },
  columns = {
    { column = 'name', type = 'text', not_null = true },
    { column = 'tags', type = 'jsonb' },
    { column = 'geom', type = 'point', projection = 4326, not_null = true },
  }
})

-- category_map.yml'deki her "key=value" ciftinin karsiligi burada olmali (bkz. test_osm_poi_lua.py).
local wanted = {
  leisure = { park = true, garden = true, swimming_pool = true, water_park = true,
              sports_centre = true, fitness_centre = true, nature_reserve = true,
              bowling_alley = true, amusement_arcade = true, climbing = true, pitch = true },
  tourism = { museum = true, theme_park = true, zoo = true, gallery = true,
              attraction = true },
  amenity = { cinema = true, arts_centre = true, cafe = true, restaurant = true,
              bar = true, pub = true, nightclub = true },
  natural = { heath = true },
  route = { hiking = true },
}

-- category_map.yml'e giden ve kartta kullanilan etiketler; gerisi atilir.
local keep = { 'name', 'wikidata', 'wikimedia_commons', 'image', 'opening_hours',
               'website', 'addr:city', 'leisure', 'tourism', 'amenity', 'natural',
               'sport', 'route' }

local function matches(tags)
  for key, values in pairs(wanted) do
    local v = tags[key]
    if v ~= nil and values[v] then return true end
  end
  -- sport=* yalniz sports_centre uzerinde anlamli
  if tags.sport ~= nil and tags.leisure == 'sports_centre' then return true end
  return false
end

local function slim(tags)
  local out = {}
  for _, k in ipairs(keep) do
    if tags[k] ~= nil then out[k] = tags[k] end
  end
  return out
end

local function add(tags, geom)
  poi:insert({ name = tags.name, tags = slim(tags), geom = geom })
end

function osm2pgsql.process_node(object)
  if object.tags.name == nil or not matches(object.tags) then return end
  add(object.tags, object:as_point())
end

function osm2pgsql.process_way(object)
  if object.tags.name == nil or not matches(object.tags) then return end
  if not object.is_closed then return end
  add(object.tags, object:as_polygon():centroid())
end

function osm2pgsql.process_relation(object)
  local t = object.tags
  if t.name == nil then return end
  if t.route == 'hiking' then
    add(t, object:as_multilinestring():centroid())
    return
  end
  if t.type == 'multipolygon' and matches(t) then
    add(t, object:as_multipolygon():centroid())
  end
end
