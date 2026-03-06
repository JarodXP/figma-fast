/**
 * FigJam-specific plugin handlers.
 * These only work when figma.editorType === 'figjam'.
 */

/** Throws if not in FigJam context */
function requireFigjam(toolName: string): void {
  if ((figma as any).editorType !== 'figjam') {
    throw new Error(`${toolName} is only available in FigJam files.`);
  }
}

export async function handleJamCreateSticky(
  text: string,
  color?: string,
  x?: number,
  y?: number,
  width?: number,
  height?: number,
  parentId?: string,
): Promise<unknown> {
  requireFigjam('jam_create_sticky');
  const sticky = (figma as any).createSticky() as any;
  // Load font for sticky text -- FigJam stickies use Inter Medium by default
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  sticky.text.characters = text;
  // StickyNode has no resize() — it supports only isWideWidth (square vs wide).
  // Treat width > 240 (the default square size) as a request for wide mode.
  if (width !== undefined && width > 240) {
    sticky.isWideWidth = true;
  }
  if (x !== undefined) sticky.x = x;
  if (y !== undefined) sticky.y = y;
  if (color) {
    const stickyColors: Record<string, { r: number; g: number; b: number }> = {
      YELLOW:      { r: 0.976, g: 0.898, b: 0.278 }, // #F9E547
      ORANGE:      { r: 1.000, g: 0.588, b: 0.251 }, // #FF9640
      GREEN:       { r: 0.208, g: 0.816, b: 0.451 }, // #35D073
      LIGHT_GREEN: { r: 0.694, g: 0.918, b: 0.545 }, // #B1EA8B
      RED:         { r: 1.000, g: 0.322, b: 0.467 }, // #FF5277
      BLUE:        { r: 0.000, g: 0.690, b: 1.000 }, // #00B0FF
      VIOLET:      { r: 0.545, g: 0.275, b: 1.000 }, // #8B46FF
      PINK:        { r: 1.000, g: 0.388, b: 0.651 }, // #FF63A6
      GRAY:        { r: 0.600, g: 0.600, b: 0.600 }, // #999999
    };
    const rgb = stickyColors[color.toUpperCase()];
    if (rgb) {
      sticky.fills = [{ type: 'SOLID', color: rgb }];
    }
  }
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'children' in parent) {
      (parent as any).appendChild(sticky);
    }
  }
  try { figma.commitUndo?.(); } catch { /* may not be available */ }
  return { nodeId: sticky.id, name: sticky.name, type: sticky.type, width: sticky.width, height: sticky.height };
}

export async function handleJamCreateConnector(
  startNodeId?: string,
  endNodeId?: string,
  startPosition?: { x: number; y: number },
  endPosition?: { x: number; y: number },
  startStrokeCap?: string,
  endStrokeCap?: string,
): Promise<unknown> {
  requireFigjam('jam_create_connector');
  const connector = (figma as any).createConnector() as any;

  if (startNodeId) {
    const startNode = await figma.getNodeByIdAsync(startNodeId);
    if (!startNode) throw new Error(`Start node not found: ${startNodeId}`);
    connector.connectorStart = { endpointNodeId: startNodeId, magnet: 'AUTO' };
  } else if (startPosition) {
    connector.connectorStart = { position: startPosition };
  }

  if (endNodeId) {
    const endNode = await figma.getNodeByIdAsync(endNodeId);
    if (!endNode) throw new Error(`End node not found: ${endNodeId}`);
    connector.connectorEnd = { endpointNodeId: endNodeId, magnet: 'AUTO' };
  } else if (endPosition) {
    connector.connectorEnd = { position: endPosition };
  }

  if (startStrokeCap) connector.connectorStartStrokeCap = startStrokeCap;
  if (endStrokeCap) connector.connectorEndStrokeCap = endStrokeCap;

  try { figma.commitUndo?.(); } catch { /* may not be available */ }
  return { nodeId: connector.id, name: connector.name, type: connector.type };
}

export async function handleJamCreateShape(
  shapeType: string,
  text?: string,
  x?: number,
  y?: number,
  parentId?: string,
): Promise<unknown> {
  requireFigjam('jam_create_shape');
  const shape = (figma as any).createShapeWithText() as any;
  shape.shapeType = shapeType;
  if (text) {
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
    shape.text.characters = text;
  }
  if (x !== undefined) shape.x = x;
  if (y !== undefined) shape.y = y;
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'children' in parent) (parent as any).appendChild(shape);
  }
  try { figma.commitUndo?.(); } catch { /* may not be available */ }
  return { nodeId: shape.id, name: shape.name, type: shape.type, shapeType: shape.shapeType };
}

export async function handleJamCreateCodeBlock(
  code: string,
  language?: string,
  x?: number,
  y?: number,
  parentId?: string,
): Promise<unknown> {
  requireFigjam('jam_create_code_block');
  const codeBlock = (figma as any).createCodeBlock() as any;
  codeBlock.code = code;
  if (language) codeBlock.codeLanguage = language;
  if (x !== undefined) codeBlock.x = x;
  if (y !== undefined) codeBlock.y = y;
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'children' in parent) (parent as any).appendChild(codeBlock);
  }
  try { figma.commitUndo?.(); } catch { /* may not be available */ }
  return { nodeId: codeBlock.id, name: codeBlock.name, type: codeBlock.type };
}

export async function handleJamCreateTable(
  numRows: number,
  numCols: number,
  cellData?: string[][],
  columnWidth?: number,
  rowHeight?: number,
  fontSize?: number,
  x?: number,
  y?: number,
  parentId?: string,
): Promise<unknown> {
  requireFigjam('jam_create_table');
  const table = await (figma as any).createTable(numRows, numCols) as any;
  if (x !== undefined) table.x = x;
  if (y !== undefined) table.y = y;

  // Must be in the document tree before geometry mutations (setColumnWidth/setRowHeight).
  // Append to current page first, then move to the target parent if specified.
  figma.currentPage.appendChild(table);
  if (parentId) {
    const parent = await figma.getNodeByIdAsync(parentId);
    if (parent && 'children' in parent) (parent as any).appendChild(table);
  }

  // Preload fonts needed for cell text — FigJam table cells may use Regular or Medium
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

  // Apply column/row sizing via the table-level API (the only supported way).
  // TABLE_CELL nodes do not support individual resize — setColumnWidth/setRowHeight
  // on the parent TableNode are the correct methods.
  if (columnWidth !== undefined) {
    for (let c = 0; c < numCols; c++) {
      table.resizeColumn(c, columnWidth);
    }
  }
  if (rowHeight !== undefined) {
    for (let r = 0; r < numRows; r++) {
      table.resizeRow(r, rowHeight);
    }
  }

  // Apply font size and cell content
  // FigJam Table API: table.cellAt(row, col) returns the TableCellNode,
  // and cell.text is the TextSublayerNode whose .characters we set.
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      try {
        const cell = (table as any).cellAt(r, c) as any;
        if (!cell?.text) continue;

        const txt = cell.text as TextNode;
        const content = cellData?.[r]?.[c];

        // Set text content first (or a placeholder if we need a range for fontSize)
        if (content !== undefined) {
          txt.characters = content;
        } else if (fontSize !== undefined && txt.characters.length === 0) {
          txt.characters = ' '; // placeholder so range op has something to target
        }

        // Apply font size as a range operation (requires non-empty characters)
        if (fontSize !== undefined && txt.characters.length > 0) {
          txt.setRangeFontSize(0, txt.characters.length, fontSize);
          // Clear placeholder if no real content was set
          if (content === undefined && txt.characters === ' ') txt.characters = '';
        }
      } catch (err) {
        console.error(`jam_create_table cell[${r}][${c}] error:`, err);
      }
    }
  }

  try { figma.commitUndo?.(); } catch { /* may not be available */ }
  return { nodeId: table.id, name: table.name, type: table.type, numRows, numColumns: numCols };
}

export async function handleJamGetTimer(): Promise<unknown> {
  requireFigjam('jam_get_timer');
  const timer = (figma as any).timer;
  if (!timer) return { status: 'unavailable' };
  return {
    remaining: timer.remaining,
    totalDuration: timer.totalDuration,
    isRunning: timer.isRunning,
    isPaused: timer.isPaused,
  };
}
