package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

interface MeetCheckinRepository extends JpaRepository<MeetCheckinEntity, MeetCheckinEntity.Id> {

    /** Hesabin met=true cevaplari, koltuk (participants.user_id) uzerinden; en yeniden eskiye. */
    @Query("select c from MeetCheckinEntity c, ParticipantEntity p "
            + "where p.id = c.id.participantId and p.userId = :userId and c.met = true "
            + "order by c.createdAt desc")
    List<MeetCheckinEntity> findMetByUser(UUID userId);
}
