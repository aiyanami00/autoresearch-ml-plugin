// Experiment Board - Kanban-style tracking for research decisions
// Tracks what was tried, what worked, and guides future research direction
import * as fs from 'fs';
import * as path from 'path';
import { ExperimentBoard, ExperimentEntry, ResearchDirection, Experiment } from '../types';

const BOARD_FILE = 'board.json';

export class ExperimentBoardTracker {
  private baseDir: string;
  private board: ExperimentBoard | null = null;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private getBoardPath(): string {
    return path.join(this.baseDir, BOARD_FILE);
  }

  private ensureInitialized(): ExperimentBoard {
    if (this.board) return this.board;

    const boardPath = this.getBoardPath();
    if (fs.existsSync(boardPath)) {
      const content = fs.readFileSync(boardPath, 'utf-8');
      this.board = JSON.parse(content) as ExperimentBoard;
    } else {
      // Initialize new board
      this.board = {
        version: '1.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalExperiments: 0,
        currentDirection: null,
        directions: [],
        entries: [],
        bestExperimentId: null,
        bestMetric: 0,
        metricDirection: 'max',
        webSearchUsed: 0,
        webFetchUsed: 0,
      };
      this.saveBoard();
    }
    return this.board as ExperimentBoard;
  }

  private saveBoard(): void {
    if (!this.board) return;
    this.board.updatedAt = Date.now();
    fs.writeFileSync(this.getBoardPath(), JSON.stringify(this.board, null, 2));
  }

  /**
   * Record a new experiment entry to the board
   */
  recordEntry(entry: Omit<ExperimentEntry, 'improvement'>): ExperimentEntry {
    const board = this.ensureInitialized();

    // Calculate improvement
    let improvement = 0;
    if (board.entries.length > 0) {
      const prevBest = board.bestMetric;
      if (board.metricDirection === 'max') {
        improvement = entry.bestMetric - prevBest;
      } else {
        improvement = prevBest - entry.bestMetric; // Lower is better
      }
    }

    const fullEntry: ExperimentEntry = {
      ...entry,
      improvement,
    };

    board.entries.push(fullEntry);
    board.totalExperiments++;

    // Update best experiment tracking
    const isBetter = board.metricDirection === 'max'
      ? entry.bestMetric > board.bestMetric
      : entry.bestMetric < board.bestMetric;

    if (isBetter || board.entries.length === 1) {
      board.bestExperimentId = entry.id;
      board.bestMetric = entry.bestMetric;
    }

    // Update current direction
    if (board.currentDirection) {
      const direction = board.directions.find(d => d.id === board.currentDirection);
      if (direction) {
        direction.experiments.push(entry.id);
        direction.lastExperimentAt = entry.timestamp;

        // Update direction's best result
        if (isBetter) {
          direction.bestResult = entry.bestMetric;
        }

        // Check if promising (improved or within 5% of best)
        const threshold = board.metricDirection === 'max'
          ? board.bestMetric * 0.95
          : board.bestMetric * 1.05;

        const entryIsGood = board.metricDirection === 'max'
          ? entry.bestMetric >= threshold
          : entry.bestMetric <= threshold;

        if (!entry.isPromising && !entryIsGood) {
          direction.consecutiveFailures++;
        } else {
          direction.consecutiveFailures = 0;
        }
      }
    }

    this.saveBoard();
    return fullEntry;
  }

  /**
   * Create or switch to a new research direction
   */
  createDirection(name: string, description: string): ResearchDirection {
    const board = this.ensureInitialized();

    const direction: ResearchDirection = {
      id: `direction-${Date.now()}`,
      name,
      description,
      status: 'active',
      experiments: [],
      bestResult: 0,
      consecutiveFailures: 0,
      lastExperimentAt: Date.now(),
    };

    board.directions.push(direction);
    board.currentDirection = direction.id;
    this.saveBoard();

    return direction;
  }

  /**
   * Switch to an existing direction or create new one
   */
  switchDirection(directionId: string | null, newDirectionName?: string, newDirectionDesc?: string): ResearchDirection | null {
    const board = this.ensureInitialized();

    if (directionId) {
      const direction = board.directions.find(d => d.id === directionId);
      if (direction) {
        board.currentDirection = directionId;
        this.saveBoard();
        return direction;
      }
    }

    if (newDirectionName && newDirectionDesc) {
      return this.createDirection(newDirectionName, newDirectionDesc);
    }

    return null;
  }

  /**
   * Check if current direction should be abandoned (3 consecutive failures)
   */
  shouldAbandonCurrentDirection(): { shouldAbandon: boolean; reason: string; direction: ResearchDirection | null } {
    const board = this.ensureInitialized();

    if (!board.currentDirection) {
      return { shouldAbandon: false, reason: 'No active direction', direction: null };
    }

    const direction = board.directions.find(d => d.id === board.currentDirection);
    if (!direction) {
      return { shouldAbandon: false, reason: 'Direction not found', direction: null };
    }

    if (direction.consecutiveFailures >= 3) {
      direction.status = 'abandoned';
      this.saveBoard();
      return {
        shouldAbandon: true,
        reason: `Direction "${direction.name}" has ${direction.consecutiveFailures} consecutive non-promising experiments`,
        direction,
      };
    }

    return {
      shouldAbandon: false,
      reason: `Direction "${direction.name}" has ${direction.consecutiveFailures} consecutive failures`,
      direction,
    };
  }

  /**
   * Get board summary for researcher to read
   */
  getBoardSummary(): string {
    const board = this.ensureInitialized();

    let summary = `# Experiment Board Summary\n\n`;
    summary += `**Total Experiments**: ${board.totalExperiments}\n`;
    summary += `**Best Result**: ${board.bestMetric.toFixed(4)} (Experiment: ${board.bestExperimentId || 'N/A'})\n`;
    summary += `**Current Direction**: ${board.currentDirection || 'None'}\n\n`;

    // Active directions
    summary += `## Research Directions\n\n`;
    for (const dir of board.directions) {
      const statusEmoji = dir.status === 'active' ? '🟢' : dir.status === 'abandoned' ? '🔴' : '✅';
      summary += `${statusEmoji} **${dir.name}** (${dir.status})\n`;
      summary += `  - Experiments: ${dir.experiments.length}\n`;
      summary += `  - Best Result: ${dir.bestResult.toFixed(4)}\n`;
      summary += `  - Consecutive Failures: ${dir.consecutiveFailures}/3\n`;
      summary += `  - Description: ${dir.description}\n\n`;
    }

    // Recent entries (last 5)
    summary += `## Recent Experiments (Last 5)\n\n`;
    const recentEntries = board.entries.slice(-5).reverse();
    for (const entry of recentEntries) {
      const improvementStr = entry.improvement > 0
        ? `+${entry.improvement.toFixed(4)}`
        : entry.improvement.toFixed(4);
      const statusEmoji = entry.status === 'completed' ? '✅' : '❌';
      summary += `${statusEmoji} **${entry.id}** - ${entry.method}\n`;
      summary += `  - Metric: ${entry.bestMetric.toFixed(4)} (${improvementStr})\n`;
      summary += `  - Key Techniques: ${entry.keyTechniques.join(', ')}\n`;
      summary += `  - Findings: ${entry.findings.slice(0, 2).join('; ')}\n\n`;
    }

    // Web usage
    summary += `## Resource Usage\n\n`;
    summary += `- WebSearch: ${board.webSearchUsed}/5\n`;
    summary += `- WebFetch: ${board.webFetchUsed}/5\n`;

    return summary;
  }

  /**
   * Get raw board data for agent processing
   */
  getBoard(): ExperimentBoard {
    return this.ensureInitialized();
  }

  /**
   * Increment web search counter
   */
  useWebSearch(): boolean {
    const board = this.ensureInitialized();
    if (board.webSearchUsed >= 5) {
      return false;
    }
    board.webSearchUsed++;
    this.saveBoard();
    return true;
  }

  /**
   * Increment web fetch counter
   */
  useWebFetch(): boolean {
    const board = this.ensureInitialized();
    if (board.webFetchUsed >= 5) {
      return false;
    }
    board.webFetchUsed++;
    this.saveBoard();
    return true;
  }

  /**
   * Get remaining web calls
   */
  getRemainingWebCalls(): { search: number; fetch: number } {
    const board = this.ensureInitialized();
    return {
      search: 5 - board.webSearchUsed,
      fetch: 5 - board.webFetchUsed,
    };
  }

  /**
   * Mark current direction as abandoned and reset
   */
  abandonCurrentDirection(reason: string): void {
    const board = this.ensureInitialized();
    if (board.currentDirection) {
      const direction = board.directions.find(d => d.id === board.currentDirection);
      if (direction) {
        direction.status = 'abandoned';
        this.saveBoard();
      }
    }
    board.currentDirection = null;
    this.saveBoard();
  }

  /**
   * Create markdown report of the board for human review
   */
  generateMarkdownReport(): string {
    const board = this.ensureInitialized();

    let md = `# AutoResearch Experiment Board\n\n`;
    md += `> Last Updated: ${new Date(board.updatedAt).toLocaleString()}\n\n`;

    md += `## Overview\n\n`;
    md += `- **Total Experiments**: ${board.totalExperiments}\n`;
    md += `- **Best Result**: ${board.bestMetric.toFixed(4)}\n`;
    md += `- **Active Directions**: ${board.directions.filter(d => d.status === 'active').length}\n`;
    md += `- **Abandoned Directions**: ${board.directions.filter(d => d.status === 'abandoned').length}\n\n`;

    md += `## All Experiments\n\n`;
    md += `| ID | Method | Metric | Status | Direction | Key Findings |\n`;
    md += `|----|--------|--------|--------|-----------|--------------|\n`;

    for (const entry of board.entries) {
      const direction = board.directions.find(d => d.experiments.includes(entry.id));
      const dirName = direction ? direction.name : 'Unknown';
      const findings = entry.findings.slice(0, 2).join('; ').substring(0, 50);
      md += `| ${entry.id} | ${entry.method.substring(0, 30)} | ${entry.bestMetric.toFixed(4)} | ${entry.status} | ${dirName} | ${findings}... |\n`;
    }

    md += `\n## Recommendations for Next Steps\n\n`;

    // Generate recommendations based on board state
    const activeDirs = board.directions.filter(d => d.status === 'active');
    const abandonedDirs = board.directions.filter(d => d.status === 'abandoned');

    if (activeDirs.length > 0) {
      md += `### Active Directions to Continue:\n`;
      for (const dir of activeDirs) {
        md += `- **${dir.name}**: ${dir.experiments.length} experiments, best result ${dir.bestResult.toFixed(4)}\n`;
      }
    }

    if (abandonedDirs.length > 0) {
      md += `\n### Abandoned Directions (Avoid):\n`;
      for (const dir of abandonedDirs) {
        md += `- **${dir.name}**: ${dir.consecutiveFailures} consecutive failures\n`;
      }
    }

    return md;
  }
}
