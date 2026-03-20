
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const DeleteUserInputSchema = z.object({
  uid: z.string().min(1, 'A user ID is required.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

export async function deleteUser(input: DeleteUserInput): Promise<{ success: boolean; message: string }> {
  return deleteUserFlow(input);
}

const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    try {
      const uid = input.uid;
      const db = getFirestore();
      const batch = db.batch();

      const collectionsToClean = [
          { name: 'attendance', field: 'userId' },
          { name: 'notifications', field: 'userId' },
          { name: 'sosAlerts', field: 'userId' },
      ];

      for (const coll of collectionsToClean) {
          const snapshot = await db.collection(coll.name).where(coll.field, '==', uid).get();
          snapshot.forEach(doc => batch.delete(doc.ref));
      }

      batch.delete(db.collection('users').doc(uid));
      await batch.commit();

      try {
        await getAuth().deleteUser(uid);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          return {
            success: true,
            message: 'Database records removed. (Auth user already missing).',
          };
        }
        throw authError; 
      }

      return {
        success: true,
        message: `Successfully deleted user ${uid} and associated data.`,
      };
    } catch (error: any) {
      console.error('Error during full user deletion:', error);
      return {
        success: false,
        message: `Failed to delete user: ${error.message || 'Unknown error'}`,
      };
    }
  }
);
