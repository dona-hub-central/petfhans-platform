'use client'

import { useState } from 'react'
import PetSummaryWidget, { type DashboardPet } from './PetSummaryWidget'
import QuickActionsWidget from './QuickActionsWidget'
import AiTipsWidget from './AiTipsWidget'

export default function DashboardWidgets({
  pets,
  appointmentCount,
  unreadMessages,
}: {
  pets: DashboardPet[]
  appointmentCount: number
  unreadMessages: number
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(pets[0]?.id)
  const selectedPet = pets.find(p => p.id === selectedId) ?? pets[0]

  return (
    <>
      <PetSummaryWidget
        pets={pets}
        appointmentCount={appointmentCount}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <QuickActionsWidget
        pets={pets}
        unreadMessages={unreadMessages}
        selectedPetId={selectedId}
      />
      <AiTipsWidget pet={selectedPet ? { id: selectedPet.id, name: selectedPet.name } : undefined} />
    </>
  )
}
