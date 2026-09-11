-- K-B26: yol tarifi baglantisi goruntuleyenin ulasim turuyle MapLinks'ten turetiliyor
-- (VenueDto.mapsUrl); kolon artik yazilmiyor ve okunmuyordu.
alter table venues drop column maps_url;
