-- Koltugun SAHIBI: bir katilimci satiri bir hesaba ait olabilir (davetli anonim de katilabilir,
-- elle eklenen noktanin sahibi yoktur -> null).
--
-- Neden: kimlik yalniz istemcideki katilimci token'inda yasiyordu. Token'i olmayan bir tarayicida
-- (yeni cihaz, temizlenmis cerez, suresi dolmus cerez) hesabini acmis bir uye "yeni misafir"
-- gibi gorunuyordu: host kendi oturumuna ikinci bir koltukla girebiliyor, davetli hayalet bir
-- katilimci birakiyordu. Hayalet koltuk orta noktayi ve deste geometrisini bozar.
alter table participants add column user_id uuid references users (id);

-- Host koltugu zaten oturumu kuran hesaba aittir: geriye donuk esle.
update participants p set user_id = s.host_id
  from sessions s
 where s.id = p.session_id and p.is_host;

-- Bir hesap bir oturumda TEK koltuk tutar. Anonim koltuklar (user_id null) disaridadir:
-- Postgres'te birden cok NULL ayni unique indexte gecerlidir, yine de niyet acik olsun diye
-- kismi index yazildi. Ayni index user_id ile koltuk aramasini da tek seek yapar.
create unique index uq_participants_session_user
    on participants (session_id, user_id) where user_id is not null;
