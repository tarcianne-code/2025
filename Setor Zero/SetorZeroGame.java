package jogo;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.ArrayList;
import java.util.Random;

public class SetorZeroGame extends JFrame implements KeyListener {
    private int playerX = 50, playerY = 50;
    private int tileSize = 50;
    private ArrayList<Rectangle> items = new ArrayList<>();
    private ArrayList<Rectangle> npcs = new ArrayList<>();
    private ArrayList<String> inventory = new ArrayList<>();
    private int phase = 1;
    private JTextArea narrative;
    private boolean gameOver = false;

    public SetorZeroGame() {
        setTitle("Setor Zero");
        setSize(800, 600);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(null);
        addKeyListener(this);
        setFocusable(true);

        narrative = new JTextArea();
        narrative.setBounds(10, 450, 760, 120);
        narrative.setLineWrap(true);
        narrative.setWrapStyleWord(true);
        narrative.setEditable(false);
        narrative.setFont(new Font("Arial", Font.PLAIN, 14));
        add(narrative);

        startPhase(phase);
        setVisible(true);
    }

    private void startPhase(int phase) {
        items.clear();
        npcs.clear();
        inventory.clear();
        playerX = 50;
        playerY = 50;
        gameOver = false;

        switch (phase) {
            case 1:
                narrative.setText("Fase 1: A Descoberta\nVocê acorda em sua casa velha e destruída. " +
                        "Sua missão: cumprir tarefas na fábrica e encontrar os arquivos importantes.");
                items.add(new Rectangle(200, 200, tileSize, tileSize)); // Arquivos
                break;
            case 2:
                narrative.setText("Fase 2: A Jornada\nVocê decidiu salvar o país. Evite os guardas e descubra a localização da fábrica mãe.");
                items.add(new Rectangle(500, 100, tileSize, tileSize)); // Sala secreta
                npcs.add(new Rectangle(300, 300, tileSize, tileSize)); // Guarda
                npcs.add(new Rectangle(600, 400, tileSize, tileSize)); // Guarda
                break;
            case 3:
                narrative.setText("Fase 3: O Confronto\nChegou a hora de confrontar o vilão. Pegue a marreta e destrua o coração da fábrica mãe.");
                items.add(new Rectangle(700, 100, tileSize, tileSize)); // Marreta
                npcs.add(new Rectangle(400, 300, tileSize, tileSize)); // Vilão
                break;
        }
        repaint();
    }

    public void paint(Graphics g) {
        super.paint(g);
        g.setColor(Color.BLUE);
        g.fillRect(playerX, playerY, tileSize, tileSize);

        g.setColor(Color.GREEN);
        for (Rectangle item : items) {
            g.fillRect(item.x, item.y, item.width, item.height);
        }

        g.setColor(Color.RED);
        for (Rectangle npc : npcs) {
            g.fillRect(npc.x, npc.y, npc.width, npc.height);
        }

        g.setColor(Color.BLACK);
        g.drawString("Inventário: " + inventory.toString(), 10, 440);
        g.drawString("Fase: " + phase, 700, 440);
    }

    private void checkCollision() {
        Rectangle playerRect = new Rectangle(playerX, playerY, tileSize, tileSize);

        // Interação com itens
        for (int i = 0; i < items.size(); i++) {
            if (playerRect.intersects(items.get(i))) {
                if (phase == 1) {
                    inventory.add("Arquivos");
                    narrative.setText("Você encontrou os arquivos! Missão da fase 1 completa.");
                } else if (phase == 2) {
                    inventory.add("Mapa da Fábrica Mãe");
                    narrative.setText("Você encontrou a sala secreta! Agora sabe onde fica a fábrica mãe.");
                } else if (phase == 3) {
                    inventory.add("Marreta");
                    narrative.setText("Você pegou a marreta! Confronte o vilão e destrua o coração.");
                }
                items.remove(i);
                i--;
            }
        }

        // Colisão com NPCs
        for (Rectangle npc : npcs) {
            if (playerRect.intersects(npc)) {
                if (phase == 3 && inventory.contains("Marreta")) {
                    narrative.setText("Você derrotou o vilão e destruiu o coração da fábrica mãe! Vitória!");
                } else {
                    narrative.setText("Você foi pego! Tente novamente.");
                }
                gameOver = true;
            }
        }

        repaint();
    }

    private void moveNPCs() {
        Random rand = new Random();
        for (Rectangle npc : npcs) {
            int dir = rand.nextInt(4);
            switch (dir) {
                case 0: npc.x += 10; break;
                case 1: npc.x -= 10; break;
                case 2: npc.y += 10; break;
                case 3: npc.y -= 10; break;
            }
            npc.x = Math.max(0, Math.min(getWidth() - tileSize, npc.x));
            npc.y = Math.max(0, Math.min(getHeight() - tileSize, npc.y));
        }
    }

    @Override
    public void keyPressed(KeyEvent e) {
        if (gameOver) return;

        int key = e.getKeyCode();
        switch (key) {
            case KeyEvent.VK_LEFT: playerX -= 10; break;
            case KeyEvent.VK_RIGHT: playerX += 10; break;
            case KeyEvent.VK_UP: playerY -= 10; break;
            case KeyEvent.VK_DOWN: playerY += 10; break;
            case KeyEvent.VK_SPACE:
                checkCollision();
                break;
        }

        playerX = Math.max(0, Math.min(getWidth() - tileSize, playerX));
        playerY = Math.max(0, Math.min(getHeight() - tileSize, playerY));

        moveNPCs();
        checkCollision();

        // Verificar conclusão da fase
        if (inventory.contains("Arquivos") && phase == 1) {
            phase = 2;
            startPhase(phase);
        } else if (inventory.contains("Mapa da Fábrica Mãe") && phase == 2) {
            phase = 3;
            startPhase(phase);
        }

        repaint();
    }

    @Override
    public void keyReleased(KeyEvent e) {}
    @Override
    public void keyTyped(KeyEvent e) {}

    public static void main(String[] args) {
        new SetorZeroGame();
    }
}
