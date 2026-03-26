-- Replace satellite with transit in the map_layer check constraint
alter table user_preferences drop constraint if exists user_preferences_map_layer_check;
alter table user_preferences add constraint user_preferences_map_layer_check
  check (map_layer in ('default', 'transit', 'terrain'));

-- Migrate any existing satellite preferences to default
update user_preferences set map_layer = 'default' where map_layer = 'satellite';
