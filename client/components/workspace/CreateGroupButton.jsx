'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import CreateGroupModal from '@/components/workspace/CreateGroupModal';

export default function CreateGroupButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4" />
        Create Group
      </Button>
      <CreateGroupModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
