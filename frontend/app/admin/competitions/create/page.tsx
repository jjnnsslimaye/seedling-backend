'use client';

/**
 * Create Competition page
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/auth';
import { Card, Button, Alert } from '@/components/ui';
import { createCompetition, CreateCompetitionRequest } from '@/lib/api/admin';
import ImageCropperModal from '@/components/ImageCropperModal';
import { api } from '@/lib/api';

interface RubricCriterion {
  name: string;
  weight: number;
  description: string;
}

function CreateCompetitionContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Basic fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [maxEntries, setMaxEntries] = useState('100');
  const [openDate, setOpenDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [judgingSLA, setJudgingSLA] = useState('14');
  const [platformFee, setPlatformFee] = useState('10');

  // Rubric state
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([
    { name: '', weight: 0, description: '' },
  ]);

  // Prize structure state (custom only)
  const [prizes, setPrizes] = useState<Array<{ place: string; percentage: number }>>([
    { place: 'first', percentage: 0 },
  ]);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: CreateCompetitionRequest) => {
      return await createCompetition(data);
    },
    onSuccess: (competition) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-competitions'] });

      router.push(`/admin/competitions/${competition.id}`);
    },
  });

  // Calculate total rubric weight
  const totalRubricWeight = rubricCriteria.reduce((sum, criterion) => sum + criterion.weight, 0);

  // Calculate total prize percentage
  const totalPrizePercentage = prizes.reduce((sum, prize) => sum + prize.percentage, 0);

  // Add rubric criterion
  const addCriterion = () => {
    setRubricCriteria([...rubricCriteria, { name: '', weight: 0, description: '' }]);
  };

  // Remove rubric criterion
  const removeCriterion = (index: number) => {
    if (rubricCriteria.length > 1) {
      setRubricCriteria(rubricCriteria.filter((_, i) => i !== index));
    }
  };

  // Update rubric criterion
  const updateCriterion = (index: number, field: keyof RubricCriterion, value: string | number) => {
    const updated = [...rubricCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setRubricCriteria(updated);
  };

  // Add prize place
  const addPrizePlace = () => {
    setPrizes([...prizes, { place: '', percentage: 0 }]);
  };

  // Remove prize place
  const removePrizePlace = (index: number) => {
    if (prizes.length > 1) {
      setPrizes(prizes.filter((_, i) => i !== index));
    }
  };

  // Update prize place
  const updatePrizePlace = (index: number, field: 'place' | 'percentage', value: string | number) => {
    const updated = [...prizes];
    updated[index] = { ...updated[index], [field]: value };
    setPrizes(updated);
  };

  // Get prize structure
  const getPrizeStructure = (): Record<string, number> => {
    return prizes.reduce((acc, prize) => {
      if (prize.place) {
        acc[prize.place] = prize.percentage;
      }
      return acc;
    }, {} as Record<string, number>);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Basic validation
    if (!title.trim()) errors.push('Title is required');
    if (!description.trim()) errors.push('Description is required');
    if (!domain.trim()) errors.push('Domain is required');
    if (parseFloat(entryFee) < 0) errors.push('Entry fee cannot be negative');
    if (parseInt(maxEntries) < 1) errors.push('Max entries must be at least 1');
    if (!openDate) errors.push('Open date is required');
    if (!deadline) errors.push('Deadline is required');

    // Date validation
    const openDateTime = new Date(openDate);
    const deadlineDateTime = new Date(deadline);
    const now = new Date();

    if (openDateTime <= now) errors.push('Open date must be in the future');
    if (deadlineDateTime <= now) errors.push('Deadline must be in the future');
    if (deadlineDateTime <= openDateTime) errors.push('Deadline must be after open date');

    // Rubric validation
    if (rubricCriteria.some(c => !c.name.trim())) errors.push('All rubric criteria must have a name');
    if (Math.abs(totalRubricWeight - 1.0) > 0.001) errors.push('Rubric weights must sum to 1.0');

    // Prize structure validation
    if (prizes.some(p => !p.place.trim())) {
      errors.push('All prize places must have a name');
    }
    if (totalPrizePercentage > 1.0) {
      errors.push('Total prize percentage cannot exceed 1.0 (100%)');
    }
    if (Math.abs(totalPrizePercentage - 1.0) > 0.001) {
      errors.push('Prize percentages must sum to 1.0 (100%)');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Show confirmation modal instead of submitting immediately
    setShowConfirmModal(true);
  };

  const confirmCreate = async () => {
    // Build rubric object
    const rubric = rubricCriteria.reduce((acc, criterion) => {
      acc[criterion.name] = {
        weight: criterion.weight,
        description: criterion.description,
      };
      return acc;
    }, {} as Record<string, any>);

    // Build request data
    const data: CreateCompetitionRequest = {
      title,
      description,
      domain,
      entry_fee: parseFloat(entryFee),
      max_entries: parseInt(maxEntries),
      deadline: new Date(deadline).toISOString(),
      open_date: new Date(openDate).toISOString(),
      judging_sla_days: parseInt(judgingSLA),
      rubric,
      prize_structure: getPrizeStructure(),
      platform_fee_percentage: parseFloat(platformFee),
    };

    setShowConfirmModal(false);

    try {
      // Create competition first
      console.log('Creating competition with data:', data);
      const newCompetition = await createCompetition(data);
      console.log('Created competition:', newCompetition);

      // Upload image if provided
      if (imageFile && newCompetition.id) {
        console.log('Uploading image for competition:', newCompetition.id);
        console.log('Image file:', imageFile);
        console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL);
        console.log('Full upload URL:', `${process.env.NEXT_PUBLIC_API_URL}/api/v1/competitions/${newCompetition.id}/upload-image`);

        const imageFormData = new FormData();
        imageFormData.append('file', imageFile);

        try {
          const imageResponse = await api.post(
            `/competitions/${newCompetition.id}/upload-image`,
            imageFormData,
            {
              headers: { 'Content-Type': 'multipart/form-data' }
            }
          );

          console.log('Image uploaded successfully:', imageResponse.data);
        } catch (imageError: any) {
          console.error('Error uploading image:', imageError);
          console.error('Error response:', imageError.response?.data);
          console.error('Error status:', imageError.response?.status);

          // Don't fail the whole creation, just log the error and show alert
          alert(
            'Competition created successfully, but image upload failed. ' +
            'You can add an image later by editing the competition.\n\n' +
            `Error: ${imageError.response?.data?.detail || imageError.message}`
          );
        }
      } else {
        console.log('No image to upload or missing competition ID');
        if (!imageFile) console.log('imageFile is null');
        if (!newCompetition.id) console.log('competition ID is missing');
      }

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-competitions'] });

      // Redirect to competition page
      router.push(`/admin/competitions/${newCompetition.id}`);
    } catch (error: any) {
      console.error('Failed to create competition:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Show error alert with details
      alert(
        'Failed to create competition.\n\n' +
        `Error: ${error.response?.data?.detail || error.message}`
      );

      // Re-open modal to allow user to try again
      setShowConfirmModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Create New Competition</h1>
          <p className="mt-2 text-lg text-gray-600">
            Set up a new competition for founders to participate in
          </p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="error" className="mb-6">
            <div className="text-sm font-semibold mb-2">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* API Error */}
        {createMutation.isError && (
          <Alert variant="error" className="mb-6">
            {(createMutation.error as any)?.response?.data?.detail || 'Failed to create competition'}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  placeholder="e.g., AI Startup Pitch Competition"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Describe the competition, what participants will compete on, and what you're looking for..."
                />
              </div>

              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                  Domain *
                </label>
                <input
                  id="domain"
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  placeholder="e.g., AI, SaaS, FinTech"
                />
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Cover Image (Optional)
                </label>
                <p className="text-sm text-slate-600 mb-3">
                  Upload a cover image to make your competition stand out. Recommended size: 1200x675px (16:9 ratio)
                </p>

                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Competition cover preview"
                      className="w-full h-48 object-cover rounded-2xl border-2 border-slate-200"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImageSrc(imagePreview);
                          setShowImageCropper(true);
                        }}
                        className="bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-brand-400 transition-colors">
                    <input
                      type="file"
                      id="cover-image"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size
                          if (file.size > 5 * 1024 * 1024) {
                            alert('File size must be less than 5MB');
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = () => {
                            setImageSrc(reader.result as string);
                            setShowImageCropper(true);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="cover-image"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-3">
                        <span className="text-3xl">📸</span>
                      </div>
                      <span className="text-brand-600 font-semibold hover:text-brand-700">
                        Upload Cover Image
                      </span>
                      <span className="text-sm text-slate-500 mt-1">
                        JPG, PNG, or WebP (Max 5MB)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Competition Details */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Competition Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="entry-fee" className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Fee ($) *
                </label>
                <input
                  id="entry-fee"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label htmlFor="max-entries" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Entries *
                </label>
                <input
                  id="max-entries"
                  type="number"
                  required
                  min="1"
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label htmlFor="open-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Open Date *
                </label>
                <input
                  id="open-date"
                  type="datetime-local"
                  required
                  value={openDate}
                  onChange={(e) => setOpenDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
                <p className="mt-1 text-xs text-gray-500">When submissions will open</p>
              </div>

              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline *
                </label>
                <input
                  id="deadline"
                  type="datetime-local"
                  required
                  value={deadline}
                  min={openDate || undefined}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
                <p className="mt-1 text-xs text-gray-500">Must be after open date</p>
              </div>

              <div>
                <label htmlFor="judging-sla" className="block text-sm font-medium text-gray-700 mb-1">
                  Judging SLA (Days) *
                </label>
                <input
                  id="judging-sla"
                  type="number"
                  required
                  min="1"
                  value={judgingSLA}
                  onChange={(e) => setJudgingSLA(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
                <p className="mt-1 text-xs text-gray-500">Days to complete judging</p>
              </div>

              <div>
                <label htmlFor="platform-fee" className="block text-sm font-medium text-gray-700 mb-1">
                  Platform Fee (%) *
                </label>
                <input
                  id="platform-fee"
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          </Card>

          {/* Rubric Builder */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Judging Rubric</h2>
              <div className="text-sm">
                <span className="font-medium">Total Weight:</span>{' '}
                <span className={Math.abs(totalRubricWeight - 1.0) < 0.001 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {totalRubricWeight.toFixed(2)}
                </span>
                <span className="text-gray-500"> / 1.0</span>
              </div>
            </div>

            {totalRubricWeight > 1.0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  Total weight cannot exceed 1.0
                </p>
              </div>
            )}

            <div className="space-y-4">
              {rubricCriteria.map((criterion, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Criterion Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                        placeholder="e.g., Innovation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="1"
                        step="0.01"
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={criterion.description}
                        onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                        placeholder="e.g., Uniqueness of solution"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      {rubricCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCriterion(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                onClick={addCriterion}
                variant="secondary"
                className="w-full"
                disabled={totalRubricWeight >= 1.0}
              >
                + Add Criterion
              </Button>
              {totalRubricWeight >= 1.0 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Total weight is at 1.0 - adjust existing criteria to add more
                </p>
              )}
            </div>
          </Card>

          {/* Prize Structure */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Prize Structure</h2>
              <div className="text-sm">
                <span className="font-medium">Total:</span>{' '}
                <span className={Math.abs(totalPrizePercentage - 1.0) < 0.001 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {(totalPrizePercentage * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {totalPrizePercentage > 1.0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  Total percentage cannot exceed 100%
                </p>
              </div>
            )}

            <div className="space-y-3">
              {prizes.map((prize, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Place *
                      </label>
                      <input
                        type="text"
                        required
                        value={prize.place}
                        onChange={(e) => updatePrizePlace(index, 'place', e.target.value)}
                        placeholder="e.g., first, second, third"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Percentage (0-1) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="1"
                        step="0.01"
                        value={prize.percentage}
                        onChange={(e) => updatePrizePlace(index, 'percentage', parseFloat(e.target.value) || 0)}
                        placeholder="0.00 - 1.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">{(prize.percentage * 100).toFixed(1)}%</p>
                    </div>
                    <div className="col-span-2 flex items-end">
                      {prizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrizePlace(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                onClick={addPrizePlace}
                variant="secondary"
                className="w-full"
                disabled={totalPrizePercentage >= 1.0}
              >
                + Add Prize Place
              </Button>
              {totalPrizePercentage >= 1.0 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Total percentage is at 100% - adjust existing prizes to add more
                </p>
              )}
            </div>
          </Card>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                totalRubricWeight > 1.0 ||
                totalPrizePercentage > 1.0
              }
              className="bg-brand-600 hover:bg-brand-700"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Competition'}
            </Button>
          </div>
        </form>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                <h2 className="text-2xl font-bold text-slate-900">Review Competition</h2>
                <p className="text-sm text-slate-600 mt-1">
                  This is how your competition will appear to founders
                </p>
              </div>

              {/* Modal Content */}
              <div className="p-6">

                {/* Competition Card Preview */}
                <div className="mb-6">
                  <label className="text-sm font-semibold text-slate-700 mb-3 block">
                    Competition Card Preview
                  </label>

                  <div className="max-w-sm mx-auto">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-card border-2 border-brand-200">

                      {/* Image Section */}
                      <div className="relative h-48 overflow-hidden">
                        {imagePreview ? (
                          <>
                            <img
                              src={imagePreview}
                              alt="Card preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200">
                            <div className="absolute inset-0 opacity-5">
                              <div className="absolute top-4 left-4 text-8xl">🌱</div>
                              <div className="absolute bottom-4 right-4 text-8xl">🌿</div>
                            </div>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md">
                          <span className="text-2xl">🌱</span>
                        </div>

                        <div className="absolute top-4 left-4">
                          <span className="inline-block px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-slate-600 shadow-sm">
                            Draft
                          </span>
                        </div>

                        <div className="absolute bottom-4 left-4">
                          <span className="inline-block px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-700 shadow-sm">
                            {domain || 'Technology'}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5">
                        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">
                          {title || 'Your Competition Title'}
                        </h3>

                        <div className="flex items-center justify-between mb-3 text-sm">
                          <div>
                            <span className="text-slate-500">Prize Pool: </span>
                            <span className="font-bold text-slate-900">
                              ${entryFee && maxEntries ? (parseFloat(entryFee) * parseInt(maxEntries) * (1 - parseFloat(platformFee) / 100)).toFixed(2) : '0.00'}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            {deadline ? new Date(deadline).toLocaleDateString() : 'No deadline'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full w-0" />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                            0/{maxEntries || '0'}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-2xl font-extrabold text-slate-900">${entryFee ? parseFloat(entryFee).toFixed(2) : '0.00'}</span>
                          <span className="text-sm text-slate-500">entry</span>
                        </div>

                        <button className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold py-3 rounded-xl">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Competition Details Summary */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span className="font-semibold text-slate-900">Draft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Entry Fee:</span>
                    <span className="font-semibold text-slate-900">${entryFee ? parseFloat(entryFee).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Max Entries:</span>
                    <span className="font-semibold text-slate-900">{maxEntries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Platform Fee:</span>
                    <span className="font-semibold text-slate-900">{platformFee}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Max Prize Pool:</span>
                    <span className="font-semibold text-brand-700 text-base">
                      ${entryFee && maxEntries ? (parseFloat(entryFee) * parseInt(maxEntries) * (1 - parseFloat(platformFee) / 100)).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-600">Opens:</span>
                    <span className="font-semibold text-slate-900">
                      {openDate ? new Date(openDate).toLocaleString() : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Deadline:</span>
                    <span className="font-semibold text-slate-900">
                      {deadline ? new Date(deadline).toLocaleString() : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 rounded-b-3xl flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-white border-2 border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Go Back & Edit
                </button>
                <button
                  type="button"
                  onClick={confirmCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Competition'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Cropper Modal */}
        {showImageCropper && imageSrc && (
          <ImageCropperModal
            imageSrc={imageSrc}
            onCropComplete={(croppedFile) => {
              // Convert Blob to File
              const file = new File([croppedFile], 'cover-image.jpg', { type: 'image/jpeg' });
              setImageFile(file);
              setImagePreview(URL.createObjectURL(croppedFile));
              setShowImageCropper(false);
            }}
            onClose={() => {
              setShowImageCropper(false);
              if (!imagePreview) {
                setImageSrc(null);
              }
            }}
            aspectRatio={16 / 9}
          />
        )}
      </div>
    </div>
  );
}

export default function CreateCompetitionPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <CreateCompetitionContent />
    </ProtectedRoute>
  );
}
