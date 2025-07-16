import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../LandingPage';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('LandingPage', () => {
  it('renders the main heading', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByRole('heading', { name: /^recovr$/i, level: 1 })).toBeInTheDocument();
  });

  it('displays the call-to-action buttons', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByRole('link', { name: /start your journey/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('shows feature cards', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByRole('heading', { name: /multi-addiction support/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /community support/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /crisis intervention/i })).toBeInTheDocument();
  });

  it('displays pricing information', () => {
    renderWithRouter(<LandingPage />);
    
    expect(screen.getByText(/affordable recovery support/i)).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$150')).toBeInTheDocument();
  });
});