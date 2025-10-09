import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BasePlanViewer } from '../BasePlanViewer';
import { FileCode } from 'lucide-react';

describe('BasePlanViewer', () => {
  it('renders title correctly', () => {
    const { getByText } = render(
      <BasePlanViewer
        title="Test Plan"
        sections={[]}
      />
    );
    
    expect(getByText('Test Plan')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <BasePlanViewer
        title="Test Plan"
        subtitle="Test subtitle"
        sections={[]}
      />
    );
    
    expect(getByText('Test subtitle')).toBeInTheDocument();
  });

  it('renders complexity badge when provided', () => {
    const { getByText } = render(
      <BasePlanViewer
        title="Test Plan"
        complexity={{ value: "5 steps", color: "text-green-500" }}
        sections={[]}
      />
    );
    
    expect(getByText('5 steps')).toBeInTheDocument();
  });

  it('renders sections correctly', () => {
    const { getByText } = render(
      <BasePlanViewer
        title="Test Plan"
        sections={[
          {
            title: "Section 1",
            content: <p>Section 1 content</p>
          },
          {
            title: "Section 2",
            content: <p>Section 2 content</p>
          }
        ]}
      />
    );
    
    expect(getByText('Section 1')).toBeInTheDocument();
    expect(getByText('Section 1 content')).toBeInTheDocument();
    expect(getByText('Section 2')).toBeInTheDocument();
    expect(getByText('Section 2 content')).toBeInTheDocument();
  });

  it('renders alerts when provided', () => {
    const { getByText } = render(
      <BasePlanViewer
        title="Test Plan"
        alerts={[
          {
            type: "destructive",
            icon: FileCode,
            title: "Warning",
            description: "Test warning"
          }
        ]}
        sections={[]}
      />
    );
    
    expect(getByText('Warning')).toBeInTheDocument();
    expect(getByText('Test warning')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    const { getByText } = render(
      <BasePlanViewer
        title="Test Plan"
        sections={[]}
        actions={<button>Test Action</button>}
      />
    );
    
    expect(getByText('Test Action')).toBeInTheDocument();
  });
});
