import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TimeSlotConflictPreventionProps {
  selectedDate: Date | undefined;
  onBookedSlotsUpdate: (bookedSlots: string[]) => void;
}

const TimeSlotConflictPrevention = ({ selectedDate, onBookedSlotsUpdate }: TimeSlotConflictPreventionProps) => {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots();
      // Set up real-time subscription for this date
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      
      const subscription = supabase
        .channel(`time-slots-${dateKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'consultations',
            filter: `preferred_date=eq.${selectedDate.toISOString()}`
          },
          () => {
            // Refetch booked slots when changes occur
            fetchBookedSlots();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedDate]);

  const fetchBookedSlots = async () => {
    if (!selectedDate) return;

    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('preferred_time')
        .eq('preferred_date', selectedDate.toISOString().split('T')[0])
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;

      const slots = data?.map(item => item.preferred_time) || [];
      setBookedSlots(slots);
      onBookedSlotsUpdate(slots);
    } catch (error) {
      console.error('Error fetching booked slots:', error);
    }
  };

  return null; // This is a logic-only component
};

export default TimeSlotConflictPrevention;