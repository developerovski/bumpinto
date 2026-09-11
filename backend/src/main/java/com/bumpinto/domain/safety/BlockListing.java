package com.bumpinto.domain.safety;

/**
 * Engel listesinin satiri (K-W16): engel + engellenenin OKUMA ANINDAKI adi. Ad engelde
 * saklanmaz — kisi adini degistirirse liste yeni adi gosterir. Silinmis hesap, anonimlesmis
 * koltuk ya da bos ad → {@code null}: "Silindi"/"Ayrildi" yer tutuculari ad degildir.
 */
public record BlockListing(Block block, String displayName) {
}
