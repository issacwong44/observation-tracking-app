import { supabase } from './supabase'

export async function writeAuditLog({
  staff,
  actionType,
  entityType,
  entityId = null,
  bedNo = null,
  oldData = null,
  newData = null,
  metadata = null
}) {
  if (!staff?.id || !staff?.staffId) {
    throw new Error(
      'Unable to write audit log: staff session missing'
    )
  }

  const { data, error } = await supabase.rpc(
    'log_staff_action',
    {
      p_staff_member_id: staff.id,
      p_staff_id: staff.staffId,
      p_staff_name: staff.displayName,
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id:
        entityId !== null
          ? String(entityId)
          : null,
      p_bed_no:
        bedNo !== null
          ? String(bedNo)
          : null,
      p_old_data: oldData,
      p_new_data: newData,
      p_metadata: metadata
    }
  )

  if (error) {
    console.error('Audit log error:', error)
    throw error
  }

  return data
}