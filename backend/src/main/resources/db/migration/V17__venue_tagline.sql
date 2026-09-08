-- R-B7: "neyle bilinir" satiri. Kaynak da saklanir: FSQ ipucu ile acik veri turevi ayni alani
-- doldurur ama UI'da farkli atif gerektirir (Powered by Foursquare / OSM).
alter table venues add column tagline text;
alter table venues add column tagline_source text;
alter table venues add constraint venues_tagline_source_check
    check (tagline_source is null or tagline_source in ('FSQ', 'OSM'));
alter table venues add constraint venues_tagline_len_check
    check (tagline is null or char_length(tagline) <= 80);
