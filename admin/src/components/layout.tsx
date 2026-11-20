import React from 'react';
import { Box, Grid2 as Grid } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

/** Responsive column widths (1-12), same semantics as xs/sm/md/lg/xl in jsonConfig. */
export interface Cols {
    /** width on extra small screens */
    xs?: number;
    /** width on small screens */
    sm?: number;
    /** width on medium screens */
    md?: number;
    /** width on large screens */
    lg?: number;
    /** width on extra large screens */
    xl?: number;
}

/** Full width on all breakpoints. */
export const FULL: Cols = { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 };

interface CellProps {
    /** column widths */
    cols: Cols;
    /** start a new row before this cell (jsonConfig `newLine`) */
    newLine?: boolean;
    children: React.ReactNode;
}

/**
 * Grid cell, optionally starting a new row.
 *
 * @param props see CellProps
 */
export function Cell(props: CellProps): React.JSX.Element {
    const item = (
        <Grid
            size={props.cols}
            sx={{ marginBottom: 0, textAlign: 'left' }}
        >
            {props.children}
        </Grid>
    );
    if (props.newLine) {
        return (
            <>
                <div style={{ flexBasis: '100%', height: 0 }} />
                {item}
            </>
        );
    }
    return item;
}

interface TextProps {
    /** translation key (or literal text if no translation exists) */
    text: string;
    /** start a new row before this element */
    newLine?: boolean;
}

/**
 * Section header, rendered like a jsonConfig `header` with size 2.
 *
 * @param props see TextProps
 */
export function SectionHeader(props: TextProps): React.JSX.Element {
    return (
        <Cell
            cols={{ xs: 12 }}
            newLine={props.newLine}
        >
            <Box
                component="h2"
                sx={theme => ({
                    width: '100%',
                    background: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    padding: '4px !important',
                    borderRadius: '3px',
                    marginBlockEnd: 0,
                    marginBlockStart: 0,
                })}
            >
                {I18n.t(props.text)}
            </Box>
        </Cell>
    );
}

/**
 * Static hint text, like a jsonConfig `staticText`.
 *
 * @param props see TextProps
 */
export function StaticText(props: TextProps): React.JSX.Element {
    return (
        <Cell
            cols={FULL}
            newLine={props.newLine}
        >
            <Box component="span">{I18n.t(props.text)}</Box>
        </Cell>
    );
}
