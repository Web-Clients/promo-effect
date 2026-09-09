/**
 * The "i" that explains a control.
 *
 * Ion asked for it on 8 Sep so a new user can find out what a button does
 * without being told. The interesting part is that it has to work for people
 * who are not using a mouse: a native `title` attribute cannot be opened from
 * the keyboard and does not exist at all on touch, which is where most of the
 * people who need the explanation actually are.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { InfoTip, LabelWithInfo } from '../../components/ui/InfoTip';

const TEXT = 'Comisionul se aplică pe taxele locale și transportul intern, niciodată pe navlu.';

describe('InfoTip', () => {
  it('stays closed until asked', () => {
    render(<InfoTip text={TEXT} />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens on hover', () => {
    render(<InfoTip text={TEXT} />);
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT);
  });

  it('opens on click, for touch users who have no hover at all', () => {
    render(<InfoTip text={TEXT} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT);
  });

  it('opens on keyboard focus', () => {
    render(<InfoTip text={TEXT} />);
    fireEvent.focus(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<InfoTip text={TEXT} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes when the click lands elsewhere', () => {
    render(
      <div>
        <InfoTip text={TEXT} />
        <button type="button">somewhere else</button>
      </div>
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('somewhere else'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not submit the form it sits in', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <InfoTip text={TEXT} />
      </form>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('describes its trigger for a screen reader while open', () => {
    render(<InfoTip text={TEXT} label="Despre comision" />);
    const trigger = screen.getByRole('button', { name: 'Despre comision' });
    expect(trigger).not.toHaveAttribute('aria-describedby');

    fireEvent.click(trigger);
    const tip = screen.getByRole('tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', tip.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('falls back to the tip text as the accessible name', () => {
    render(<InfoTip text={TEXT} />);
    expect(screen.getByRole('button', { name: TEXT })).toBeInTheDocument();
  });
});

describe('LabelWithInfo', () => {
  it('labels the field and carries the explanation', () => {
    render(
      <>
        <LabelWithInfo htmlFor="commission" info={TEXT} required>
          Comision expediție
        </LabelWithInfo>
        <input id="commission" />
      </>
    );
    expect(screen.getByText('Comision expediție')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT);
  });
});
