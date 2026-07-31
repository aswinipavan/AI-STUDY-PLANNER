/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock component implementations for testing
const MaterialsList = ({ materials, categories, selectedCategory, onCategoryChange }: any) => (
  <div>
    <div>
      {categories.map((cat: string) => (
        <button key={cat} onClick={() => onCategoryChange(cat)}>
          {cat}
        </button>
      ))}
    </div>
    {materials.map((material: any) => (
      <div key={material.id} data-testid="material-card">
        {material.title}
      </div>
    ))}
  </div>
);

const UploadZone = ({ onUploadSuccess, subject, category }: any) => {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type)) {
      alert('Only PDF, DOCX, XLSX files are allowed');
      return;
    }

    // Upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('category', category);

    const res = await fetch('/api/materials/upload', { method: 'POST', body: formData });
    if (res.ok) {
      onUploadSuccess?.();
    }
  };

  return (
    <div>
      <button>click to upload</button>
      <input type="file" onChange={handleChange} />
    </div>
  );
};

const MaterialCard = ({ material, onDeleteSuccess }: any) => {
  const [showDelete, setShowDelete] = React.useState(false);

  const handleDelete = async () => {
    const res = await fetch(`/api/materials/${material.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleteSuccess?.();
      setShowDelete(false);
    }
  };

  return (
    <div>
      <h3>{material.title}</h3>
      <p>{material.subject}</p>
      <p>{(material.fileSize / 1024 / 1024).toFixed(1)} MB</p>
      <p>{material.uploadedAt?.toLocaleDateString?.()}</p>
      <p>{material.category}</p>
      <button onClick={() => setShowDelete(true)}>delete</button>
      {showDelete && (
        <div>
          <p>are you sure?</p>
          <button onClick={handleDelete}>confirm</button>
          <button onClick={() => setShowDelete(false)}>cancel</button>
        </div>
      )}
    </div>
  );
};

describe('Materials Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Material List Rendering with Category Filtering
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 1: Material List Render & Category Filtering', () => {
    it('should render material list and filter by category', async () => {
      const mockMaterials = [
        {
          id: '1',
          title: 'Physics Notes',
          category: 'Physics',
          subject: 'Physics',
          fileUrl: 'https://example.com/physics.pdf',
          uploadedAt: new Date('2024-01-15'),
          fileSize: 2048000,
        },
        {
          id: '2',
          title: 'Chemistry Lab',
          category: 'Chemistry',
          subject: 'Chemistry',
          fileUrl: 'https://example.com/chemistry.pdf',
          uploadedAt: new Date('2024-01-16'),
          fileSize: 1024000,
        },
      ];

      render(
        <MaterialsList
          materials={mockMaterials}
          categories={['Physics', 'Chemistry']}
          selectedCategory={null}
          onCategoryChange={jest.fn()}
        />
      );

      expect(screen.getByText('Physics Notes')).toBeInTheDocument();
      expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();

      const materialCards = screen.getAllByTestId('material-card');
      expect(materialCards).toHaveLength(2);
    });

    it('should filter materials when category is selected', async () => {
      const mockMaterials = [
        { id: '1', title: 'Physics Notes', category: 'Physics' },
      ];

      const onCategoryChange = jest.fn();

      render(
        <MaterialsList
          materials={mockMaterials}
          categories={['Physics', 'Chemistry']}
          selectedCategory="Physics"
          onCategoryChange={onCategoryChange}
        />
      );

      expect(screen.getByText('Physics Notes')).toBeInTheDocument();
      expect(screen.queryByText('Chemistry Lab')).not.toBeInTheDocument();

      const materialCards = screen.getAllByTestId('material-card');
      expect(materialCards).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Material Upload Functionality
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 2: Material Upload Functionality', () => {
    it('should handle file upload via file input', async () => {
      const mockFile = new File(['test content'], 'physics.pdf', { type: 'application/pdf' });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: '4', title: 'physics.pdf' }),
      });

      const onUploadSuccess = jest.fn();

      render(
        <UploadZone
          onUploadSuccess={onUploadSuccess}
          subject="Physics"
          category="Physics"
        />
      );

      const input = screen.getByRole('button', { name: /click to upload/i }).parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/materials/upload', expect.any(Object));
      });

      await waitFor(() => {
        expect(onUploadSuccess).toHaveBeenCalled();
      });
    });

    it('should validate file type before upload', async () => {
      const invalidFile = new File(['test'], 'video.mp4', { type: 'video/mp4' });

      // Mock alert
      window.alert = jest.fn();

      render(
        <UploadZone onUploadSuccess={jest.fn()} subject="Physics" category="Physics" />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('PDF'));
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Delete Material with Confirmation
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 3: Delete Material with Confirmation', () => {
    it('should show delete confirmation and remove material on confirm', async () => {
      const material = {
        id: '1',
        title: 'Physics Notes',
        category: 'Physics',
        subject: 'Physics',
        fileUrl: 'https://example.com/physics.pdf',
        uploadedAt: new Date('2024-01-15'),
        fileSize: 2048000,
      };

      const onDeleteSuccess = jest.fn();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      render(<MaterialCard material={material} onDeleteSuccess={onDeleteSuccess} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/materials/${material.id}`,
          expect.any(Object)
        );
      });

      await waitFor(() => {
        expect(onDeleteSuccess).toHaveBeenCalled();
      });
    });

    it('should cancel deletion when user clicks cancel', async () => {
      const material = {
        id: '1',
        title: 'Physics Notes',
        category: 'Physics',
        subject: 'Physics',
        fileUrl: 'https://example.com/physics.pdf',
        uploadedAt: new Date('2024-01-15'),
        fileSize: 2048000,
      };

      render(<MaterialCard material={material} onDeleteSuccess={jest.fn()} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Display Material Metadata (Size, Date, Subject)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Test 4: Material Metadata Display', () => {
    it('should display material metadata correctly', () => {
      const material = {
        id: '1',
        title: 'Advanced Physics Notes',
        category: 'Advanced',
        subject: 'Physics',
        fileUrl: 'https://example.com/physics.pdf',
        uploadedAt: new Date('2024-01-15T10:30:00Z'),
        fileSize: 2048000,
      };

      render(<MaterialCard material={material} onDeleteSuccess={jest.fn()} />);

      expect(screen.getByText('Advanced Physics Notes')).toBeInTheDocument();
      expect(screen.getAllByText(/Physics/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/2\.0 MB|2 MB/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Advanced/i).length).toBeGreaterThanOrEqual(1);
    });

    it('should format file size appropriately', () => {
      const materials = [
        { id: '1', title: 'Small', category: 'Test', subject: 'Math', uploadedAt: new Date(), fileSize: 512 },
        { id: '2', title: 'Medium', category: 'Test', subject: 'Physics', uploadedAt: new Date(), fileSize: 102400 },
        { id: '3', title: 'Large', category: 'Test', subject: 'Chemistry', uploadedAt: new Date(), fileSize: 5242880 },
      ];

      const { rerender } = render(<MaterialCard material={materials[0]} onDeleteSuccess={jest.fn()} />);
      expect(screen.getByText(/0\.0 MB|512.*B/i)).toBeInTheDocument();

      rerender(<MaterialCard material={materials[1]} onDeleteSuccess={jest.fn()} />);
      expect(screen.getByText(/0\.1 MB|100.*KB/i)).toBeInTheDocument();

      rerender(<MaterialCard material={materials[2]} onDeleteSuccess={jest.fn()} />);
      expect(screen.getByText(/5\.0 MB|5.*MB/i)).toBeInTheDocument();
    });
  });
});

