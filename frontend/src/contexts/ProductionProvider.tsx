/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { QuoteData } from '@/types/quote';
import { toast } from 'sonner';
import { ProductionJob, JobStatus } from '@/types/production';
import { ProductionContext } from '@/contexts/ProductionContext';
import * as sessionStore from '@/lib/core/sessionStorage';

const STORAGE_KEY = 'production_manager_jobs';

export const ProductionProvider = ({ children }: { children: ReactNode }) => {
    const [jobs, setJobs] = useState<ProductionJob[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    }, [jobs]);

    const addJob = useCallback((quote: QuoteData, machineId: string | null = null) => {
        const preferredMachineId = machineId
            ?? quote.assignedMachineId
            ?? (typeof quote.parameters.machineId === 'string' ? quote.parameters.machineId : null);

        const newJob: ProductionJob = {
            id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            quote: {
                ...quote,
                assignedMachineId: preferredMachineId || undefined,
            },
            status: 'queued',
            machineId: preferredMachineId,
            priority: 'normal',
            createdAt: new Date().toISOString(),
            order: jobs.length, // Append to end
        };
        setJobs(prev => [...prev, newJob]);
        toast.success('Job added to production queue');
    }, [jobs.length]);

    const updateJob = useCallback((jobId: string, updates: Partial<ProductionJob>) => {
        setJobs(prev => prev.map(job =>
            job.id === jobId ? { ...job, ...updates } : job
        ));
    }, []);

    const moveJob = useCallback((jobId: string, newStatus: JobStatus, newMachineId: string | null, newIndex?: number) => {
        setJobs(prev => {
            const jobToMove = prev.find(j => j.id === jobId);
            if (!jobToMove) return prev;

            // 1. Remove job from current list
            const filtered = prev.filter(j => j.id !== jobId);

            // 2. Update job properties
            const updatedJob = {
                ...jobToMove,
                status: newStatus,
                machineId: newMachineId,
                quote: {
                    ...jobToMove.quote,
                    assignedMachineId: newMachineId || undefined,
                },
            };

            // 3. Auto-add to stock when job moves to 'completed' status
            if (newStatus === 'completed' && jobToMove.status !== 'completed') {
                try {
                    sessionStore.addToStock(jobToMove.quote, jobToMove.quote.quantity || 1);
                    toast.success('Stock entry created from completed job');
                } catch (error) {
                    console.error('Error adding to stock:', error);
                    toast.error('Failed to create stock entry');
                }
            }

            // 4. Insert into new position
            // Filter jobs that are in the *target* list (same status & machine)
            const targetList = filtered.filter(j =>
                j.status === newStatus && j.machineId === newMachineId
            ).sort((a, b) => a.order - b.order);

            if (typeof newIndex === 'number' && newIndex >= 0 && newIndex <= targetList.length) {
                // Re-calculate orders for the whole list
                // This is a simplified "splice" simulation for React state
                const newJobsList = [...filtered];

                // We need to re-sort everything in the specific machine/status bucket
                // But since 'filtered' contains ALL jobs, we can't just splice.
                // Strategy: Get all jobs NOT in target bucket + Reconstructed Target Bucket

                const nonTargetJobs = filtered.filter(j =>
                    !(j.status === newStatus && j.machineId === newMachineId)
                );

                targetList.splice(newIndex, 0, updatedJob);

                // Re-assign order based on new array position
                targetList.forEach((j, idx) => { j.order = idx; });

                return [...nonTargetJobs, ...targetList];
            } else {
                // Append to end if no index provided
                updatedJob.order = targetList.length;
                return [...filtered, updatedJob];
            }
        });
    }, []);

    const removeJob = useCallback((jobId: string) => {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        toast.info('Job removed from production');
    }, []);

    const clearCompleted = useCallback(() => {
        setJobs(prev => prev.filter(j => j.status !== 'completed'));
        toast.success('Cleared completed jobs');
    }, []);

    const getJobsByMachine = useCallback((machineId: string) => {
        return jobs
            .filter(j => j.machineId === machineId)
            .sort((a, b) => a.order - b.order);
    }, [jobs]);

    const getUnassignedJobs = useCallback(() => {
        return jobs
            .filter(j => j.machineId === null)
            .sort((a, b) => a.order - b.order);
    }, [jobs]);

    return (
        <ProductionContext.Provider
            value={{
                jobs,
                addJob,
                updateJob,
                moveJob,
                removeJob,
                clearCompleted,
                getJobsByMachine,
                getUnassignedJobs,
            }}
        >
            {children}
        </ProductionContext.Provider>
    );
};
