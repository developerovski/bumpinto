package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

interface MeetCheckinRepository extends JpaRepository<MeetCheckinEntity, MeetCheckinEntity.Id> {
}
